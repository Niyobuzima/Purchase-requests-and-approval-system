import api from './axios';

export interface Approval {
  id: number;
  request: number;
  request_title: string;
  request_total: string;
  requester_name: string;
  approver: number | null;
  approver_details: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  } | null;
  level: number;
  level_display: string;
  status: string;
  status_display: string;
  comments: string;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalAction {
  comments?: string;
}

export interface ApprovalStats {
  pending_count: number;
  pending_amount: number;
  my_approved: number;
  my_rejected: number;
  today_processed: number;
  level: number;
  level_display: string;
}

export const approvalsAPI = {
  // Get all pending approvals for current user
  pending: async (): Promise<Approval[]> => {
    const response = await api.get('/approvals/pending/');
    // Handle paginated response - extract results array
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  },

  // Get all approvals (list)
  list: async (): Promise<Approval[]> => {
    const response = await api.get('/approvals/');
    // Handle paginated response
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  },

  // Get specific approval
  get: async (id: number): Promise<Approval> => {
    const response = await api.get(`/approvals/${id}/`);
    return response.data;
  },

  // Approve an approval
  approve: async (id: number): Promise<Approval> => {
    const response = await api.post(`/approvals/${id}/approve/`);
    return response.data;
  },

  // Reject an approval
  reject: async (id: number, comments: string): Promise<Approval> => {
    const response = await api.post(`/approvals/${id}/reject/`, { comments });
    return response.data;
  },

  // Get my approval history
  myApprovals: async (): Promise<Approval[]> => {
    const response = await api.get('/approvals/my_approvals/');
    // Handle paginated response - extract results array
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  },

  // Get approvals for a specific request
  getByRequestId: async (requestId: number): Promise<Approval[]> => {
    const response = await api.get('/approvals/', { params: { request: requestId } });
    // Handle paginated response
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  },

  // Get approval stats for dashboard
  stats: async (): Promise<ApprovalStats> => {
    const response = await api.get('/approvals/stats/');
    return response.data;
  },
};
