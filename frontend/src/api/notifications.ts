import api from './axios';
import type { PaginatedResponse } from '../types';

export interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  link: string | null;
  request_id: number | null;
  po_id: number | null;
  receipt_id: number | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export const notificationsAPI = {
  // Get all notifications (paginated)
  getAll: async (params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Notification>> => {
    const response = await api.get<PaginatedResponse<Notification>>('/notifications/', { params });
    return response.data;
  },

  // Get unread count
  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<{ count: number }>('/notifications/unread-count/');
    return response.data.count;
  },

  // Mark notification as read
  markAsRead: async (id: number): Promise<Notification> => {
    const response = await api.patch<Notification>(`/notifications/${id}/mark-read/`);
    return response.data;
  },

  // Mark all as read
  markAllAsRead: async (): Promise<{ message: string; count: number }> => {
    const response = await api.post<{ message: string; count: number }>('/notifications/mark-all-read/');
    return response.data;
  },
};
