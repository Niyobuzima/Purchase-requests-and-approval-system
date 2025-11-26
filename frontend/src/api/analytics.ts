import axios from './axios';

export interface DashboardStats {
  total_requests: number;
  pending_approvals: number;
  total_spent: number;
  active_pos: number;
  pending_receipts: number;
}

export interface SpendingByVendor {
  vendor_name: string;
  total: number;
}

export interface MonthlySpending {
  month: string;
  total: number;
}

export interface SpendingAnalytics {
  spending_by_vendor: SpendingByVendor[];
  monthly_spending: MonthlySpending[];
  total_spending: number;
}

export interface PendingReceipt {
  id: number;
  purchase_order_id: number;
  po_number: string;
  validation_status: string;
  validation_status_display: string;
  uploaded_at: string;
  uploaded_by_name: string;
  request_title: string;
  total_amount: number;
  discrepancy_count: number;
}

export interface RequestStatusDistribution {
  status: string;
  status_display: string;
  count: number;
}

export const analyticsAPI = {
  /**
   * Get dashboard summary statistics
   */
  getDashboardStats: async (): Promise<{ stats: DashboardStats }> => {
    const response = await axios.get('/analytics/dashboard/stats/');
    // Handle both wrapped and unwrapped responses
    const data = response.data;
    if (data?.stats) {
      return data;
    }
    // If stats are at root level, wrap them
    return { stats: data };
  },

  /**
   * Get spending analytics with optional date filtering
   */
  getSpendingAnalytics: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<SpendingAnalytics> => {
    const response = await axios.get('/analytics/spending/', { params });
    return response.data;
  },

  /**
   * Get list of receipts pending Finance review
   */
  getPendingReceipts: async (): Promise<{
    receipts: PendingReceipt[];
    count: number;
  }> => {
    const response = await axios.get('/analytics/receipts/pending/');
    const data = response.data;
    // Handle both wrapped and unwrapped responses
    if (data?.receipts) {
      return data;
    }
    // If receipts array is at root level or missing
    return { receipts: Array.isArray(data) ? data : [], count: 0 };
  },

  /**
   * Get distribution of requests by status
   */
  getStatusDistribution: async (): Promise<{
    distribution: RequestStatusDistribution[];
  }> => {
    const response = await axios.get('/analytics/requests/status-distribution/');
    const data = response.data;
    // Handle both wrapped and unwrapped responses
    if (data?.distribution) {
      return data;
    }
    // If distribution array is at root level or missing
    return { distribution: Array.isArray(data) ? data : [] };
  },
};
