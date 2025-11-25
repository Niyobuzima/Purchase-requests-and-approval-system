import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { jwtDecode } from 'jwt-decode';
import { UnifiedAPIResponse } from '@/types/errors';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Check if response follows the unified API response format
 */
function isUnifiedResponse(data: any): data is UnifiedAPIResponse {
  return (
    data &&
    typeof data === 'object' &&
    'success' in data &&
    typeof data.success === 'boolean'
  );
}

/**
 * Extract data from unified response format
 * Returns the original data if it's not a unified response (backwards compatibility)
 */
function extractResponseData(response: AxiosResponse): AxiosResponse {
  const data = response.data;

  // If it's a unified response format with success: true
  if (isUnifiedResponse(data) && data.success) {
    // For paginated responses, restructure to match expected format
    if (data.count !== undefined && data.data !== undefined) {
      response.data = {
        results: data.data,
        count: data.count,
        next: null,
        previous: null,
      };
    }
    // For non-paginated responses, extract the data
    else if (data.data !== undefined) {
      response.data = data.data;
    }
    // If no data field but success is true, keep as is (e.g., for messages)
  }

  return response;
}

// Request interceptor - attach access token and handle FormData
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // If sending FormData, remove Content-Type to let axios set it with boundary
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor - handle unified response format and token refresh
axiosInstance.interceptors.response.use(
  (response) => extractResponseData(response),
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Skip token refresh for auth endpoints (login, register, refresh)
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                          originalRequest.url?.includes('/auth/register') ||
                          originalRequest.url?.includes('/auth/refresh');

    // If error is 401 and we haven't retried yet and it's not an auth endpoint
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Refresh the token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access}`;
        }
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user (only if not already on login page)
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        // Only redirect if not already on login/register page
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
