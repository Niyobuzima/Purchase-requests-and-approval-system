import axiosInstance from './axios';
import type {
  PurchaseRequest,
  PurchaseRequestListItem,
  CreatePurchaseRequestData,
  UpdatePurchaseRequestData,
  PaginatedResponse,
} from '../types';

export const purchaseRequestsAPI = {
  /**
   * Get all purchase requests (filtered by user role on backend)
   */
  getAll: async (params?: {
    status?: string;
    search?: string;
    ordering?: string;
    page?: number;
  }): Promise<PaginatedResponse<PurchaseRequestListItem>> => {
    const response = await axiosInstance.get<PaginatedResponse<PurchaseRequestListItem>>(
      '/requests/',
      { params }
    );
    return response.data;
  },

  /**
   * Get current user's requests
   */
  getMyRequests: async (params?: {
    status?: string;
    search?: string;
    ordering?: string;
  }): Promise<PurchaseRequestListItem[]> => {
    const response = await axiosInstance.get<PurchaseRequestListItem[]>(
      '/requests/my_requests/',
      { params }
    );
    return response.data;
  },

  /**
   * Get single purchase request by ID
   */
  getById: async (id: number): Promise<PurchaseRequest> => {
    const response = await axiosInstance.get<PurchaseRequest>(`/requests/${id}/`);
    return response.data;
  },

  /**
   * Create new purchase request
   */
  create: async (data: CreatePurchaseRequestData): Promise<PurchaseRequest> => {
    const response = await axiosInstance.post<PurchaseRequest>('/requests/', data);
    return response.data;
  },

  /**
   * Update existing purchase request (DRAFT only)
   */
  update: async (
    id: number,
    data: Partial<UpdatePurchaseRequestData>
  ): Promise<PurchaseRequest> => {
    const response = await axiosInstance.patch<PurchaseRequest>(
      `/requests/${id}/`,
      data
    );
    return response.data;
  },

  /**
   * Delete purchase request (DRAFT only)
   */
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/requests/${id}/`);
  },

  /**
   * Submit draft request for approval
   */
  submit: async (id: number): Promise<PurchaseRequest> => {
    const response = await axiosInstance.post<PurchaseRequest>(
      `/requests/${id}/submit/`
    );
    return response.data;
  },

  /**
   * Get items for a specific request
   */
  getItems: async (id: number) => {
    const response = await axiosInstance.get(`/requests/${id}/items/`);
    return response.data;
  },
};
