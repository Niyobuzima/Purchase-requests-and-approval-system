import api from './axios';

export interface ExportRequest {
  export_type: 'PURCHASE_ORDERS' | 'RECEIPTS' | 'SPENDING_SUMMARY' | 'APPROVAL_TIMELINE';
  export_format: 'CSV' | 'PDF';
  start_date?: string;
  end_date?: string;
  status_filter?: string;
  vendor_filter?: string;
}

export interface ExportLog {
  id: number;
  user: number;
  user_name: string;
  export_type: string;
  export_format: string;
  start_date: string | null;
  end_date: string | null;
  filters_applied: Record<string, any>;
  record_count: number;
  file_size_kb: number | null;
  file_size_mb: number | null;
  generated_at: string;
  download_count: number;
}

export const reportsAPI = {
  /**
   * Export data and download file
   */
  exportData: async (params: ExportRequest): Promise<Blob> => {
    const response = await api.post('/reports/export/', params, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get export history
   */
  getExportHistory: async (): Promise<ExportLog[]> => {
    const response = await api.get('/reports/history/');
    return response.data;
  },

  /**
   * Preview data before export
   */
  previewData: async (params: Partial<ExportRequest>): Promise<any> => {
    const response = await api.get('/reports/preview/', { params });
    return response.data;
  },
};
