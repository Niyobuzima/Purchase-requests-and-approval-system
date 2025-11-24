import api from './axios';
import type {
  Receipt,
  CreateReceiptData,
  ReceiptApprovalData,
  PaginatedResponse,
} from '@/types';

export const receiptsAPI = {
  /**
   * Get all receipts (with optional filters)
   */
  getAll: async (params?: {
    search?: string;
    purchase_order?: number;
    validation_status?: string;
    po_number?: string;
    vendor?: string;
    uploaded_after?: string;
    uploaded_before?: string;
    approved_after?: string;
    approved_before?: string;
    has_discrepancies?: boolean;
    ordering?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Receipt>> => {
    const response = await api.get<PaginatedResponse<Receipt>>('/receipts/', { params });
    return response.data;
  },

  /**
   * Get a single receipt by ID
   */
  getById: async (id: number): Promise<Receipt> => {
    const response = await api.get<Receipt>(`/receipts/${id}/`);
    return response.data;
  },

  /**
   * Upload a receipt for a purchase order
   */
  create: async (data: CreateReceiptData): Promise<Receipt> => {
    const formData = new FormData();
    formData.append('purchase_order', data.purchase_order.toString());
    formData.append('receipt_file', data.receipt_file);

    const response = await api.post<Receipt>('/receipts/', formData);
    return response.data;
  },

  /**
   * Update receipt finance comments
   */
  update: async (id: number, data: Partial<Receipt>): Promise<Receipt> => {
    const response = await api.patch<Receipt>(`/receipts/${id}/`, data);
    return response.data;
  },

  /**
   * Delete a receipt
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/receipts/${id}/`);
  },

  /**
   * Validate receipt against purchase order
   */
  validate: async (id: number): Promise<{
    validation_status: string;
    discrepancies: any[];
    discrepancy_count: number;
    message: string;
  }> => {
    const response = await api.post(`/receipts/${id}/validate/`);
    return response.data;
  },

  /**
   * Approve receipt (Finance only)
   */
  approve: async (id: number, data?: ReceiptApprovalData): Promise<{
    message: string;
    receipt: Receipt;
  }> => {
    const response = await api.post(`/receipts/${id}/approve/`, data || {});
    return response.data;
  },
};
