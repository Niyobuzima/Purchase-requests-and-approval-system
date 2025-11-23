import api from './axios';

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
  request_details: any; // Full request object
}

export const purchaseOrdersAPI = {
  // Get all purchase orders
  getAll: async (): Promise<PurchaseOrder[]> => {
    const response = await api.get('/purchase-orders/');
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
  triggerDownload: (id: number, poNumber: string) => {
    purchaseOrdersAPI.downloadPDF(id).then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${poNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    });
  },
};
