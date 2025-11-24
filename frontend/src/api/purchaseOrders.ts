import api from './axios';
import type { PurchaseRequest, PaginatedResponse } from '@/types';

export interface PurchaseOrder {
  id: number;
  request: number;
  request_title: string;
  request_total: string;
  requester_name: string;
  po_number: string;
  generated_at: string;
  pdf_file: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderDetail extends PurchaseOrder {
  request_details: PurchaseRequest;
}

export const purchaseOrdersAPI = {
  // Get all purchase orders
  getAll: async (params?: {
    search?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<PurchaseOrder>> => {
    const response = await api.get<PaginatedResponse<PurchaseOrder>>('/purchase-orders/', { params });
    return response.data;
  },

  // Get specific purchase order
  getById: async (id: number): Promise<PurchaseOrderDetail> => {
    const response = await api.get(`/purchase-orders/${id}/`);
    return response.data;
  },

  // Download PO PDF
  downloadPDF: async (id: number): Promise<Blob> => {
    const response = await api.get(`/purchase-orders/${id}/download/`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Trigger download in browser
  triggerDownload: async (id: number, poNumber: string): Promise<void> => {
    let url: string | null = null;
    let link: HTMLAnchorElement | null = null;

    try {
      const blob = await purchaseOrdersAPI.downloadPDF(id);

      // Validate blob before creating object URL
      if (!blob || !(blob instanceof Blob) || blob.size === 0) {
        throw new Error('Invalid or empty file received from server');
      }

      url = window.URL.createObjectURL(blob);
      link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${poNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Failed to download PDF:', error);
      // Error will be handled by caller (e.g., showing a toast notification)
      throw error;
    } finally {
      // Cleanup: always revoke object URL and remove link element
      if (url) {
        window.URL.revokeObjectURL(url);
      }
      if (link && link.parentNode) {
        link.remove();
      }
    }
  },
};
