import axiosInstance from './axios';
import type {
  AdminUser,
  AdminDashboardStats,
  AdminUserUpdate,
  AdminCreateUser,
} from '../types';

export interface AdminUsersParams {
  role?: string;
  is_active?: boolean;
  search?: string;
}

export const adminAPI = {
  // Dashboard stats
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    const response = await axiosInstance.get<AdminDashboardStats>('/auth/admin/dashboard/');
    return response.data;
  },

  // User management
  getUsers: async (params?: AdminUsersParams): Promise<AdminUser[]> => {
    const response = await axiosInstance.get('/auth/admin/users/', { params });
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response.data)) {
      return response.data;
    }
    // If paginated response, return results array
    return response.data.results || [];
  },

  getUser: async (userId: number): Promise<AdminUser> => {
    const response = await axiosInstance.get<AdminUser>(`/auth/admin/users/${userId}/`);
    return response.data;
  },

  createUser: async (userData: AdminCreateUser): Promise<AdminUser> => {
    const response = await axiosInstance.post<AdminUser>('/auth/admin/users/', userData);
    return response.data;
  },

  updateUser: async (userId: number, data: AdminUserUpdate): Promise<AdminUser> => {
    const response = await axiosInstance.patch<AdminUser>(`/auth/admin/users/${userId}/`, data);
    return response.data;
  },

  deleteUser: async (userId: number): Promise<void> => {
    await axiosInstance.delete(`/auth/admin/users/${userId}/`);
  },

  // Bulk operations
  updateUserRole: async (userId: number, role: string): Promise<AdminUser> => {
    return adminAPI.updateUser(userId, { role: role as AdminUser['role'] });
  },

  toggleUserStatus: async (userId: number, isActive: boolean): Promise<AdminUser> => {
    return adminAPI.updateUser(userId, { is_active: isActive });
  },
};
