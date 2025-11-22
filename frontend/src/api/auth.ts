import axiosInstance from './axios';
import type {
  User,
  LoginResponse,
  LoginCredentials,
  RegisterData,
  ChangePasswordData
} from '../types';

export const authAPI = {
  register: async (userData: RegisterData): Promise<LoginResponse> => {
    const response = await axiosInstance.post<LoginResponse>('/auth/register/', userData);
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await axiosInstance.post<LoginResponse>('/auth/login/', credentials);
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await axiosInstance.get<User>('/auth/me/');
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await axiosInstance.patch<User>('/auth/me/', data);
    return response.data;
  },

  changePassword: async (passwords: ChangePasswordData): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>('/auth/change-password/', passwords);
    return response.data;
  },

  logout: async (refreshToken: string): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>('/auth/logout/', {
      refresh_token: refreshToken,
    });
    return response.data;
  },
};
