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
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalAction {
  comments?: string;
}

export const approvalsAPI = {
  // Get all pending approvals for current user
  pending: async (): Promise<Approval[]> => {
    const response = await api.get('/approvals/pending/');
    return response.data;
  },

  // Get all approvals (list)
  list: async (): Promise<Approval[]> => {
    const response = await api.get('/approvals/');
    return response.data;
  },

  // Get specific approval
  get: async (id: number): Promise<Approval> => {
    const response = await api.get(`/approvals/${id}/`);
    return response.data;
  },

  // Approve an approval
  approve: async (id: number, data?: ApprovalAction): Promise<Approval> => {
    const response = await api.post(`/approvals/${id}/approve/`, data || {});
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
    return response.data;
  },

  // Get approvals for a specific request
  getByRequestId: async (requestId: number): Promise<Approval[]> => {
    const response = await api.get('/approvals/', { params: { request: requestId } });
    // Handle paginated response
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  },
};
