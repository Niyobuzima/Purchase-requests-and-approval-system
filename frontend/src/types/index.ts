// User Types
export type UserRole = 'STAFF' | 'APPROVER_L1' | 'APPROVER_L2' | 'FINANCE';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  role_display: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ChangePasswordData {
  old_password: string;
  new_password: string;
  new_password2: string;
}

// Purchase Request Types
export interface PurchaseRequestItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: string;
  total_price?: string;
}

export interface PurchaseRequest {
  id: number;
  title: string;
  description?: string;
  vendor_name?: string;
  requester: User;
  status: 'DRAFT' | 'PENDING' | 'APPROVED_L1' | 'APPROVED_L2' | 'REJECTED' | 'CANCELLED';
  total_amount: string;
  items: PurchaseRequestItem[];
  document_url?: string;
  extracted_data?: any;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseRequestData {
  title: string;
  description?: string;
  vendor_name?: string;
  items: Omit<PurchaseRequestItem, 'id' | 'total_price'>[];
}

// Approval Types
export interface Approval {
  id: number;
  purchase_request: PurchaseRequest;
  level: 1 | 2;
  approver?: User;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comments?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalAction {
  comments?: string;
}

// Purchase Order Types
export interface PurchaseOrder {
  id: number;
  po_number: string;
  purchase_request: PurchaseRequest;
  status: 'PENDING' | 'SENT' | 'ACKNOWLEDGED' | 'COMPLETED' | 'CANCELLED';
  pdf_url?: string;
  created_at: string;
  updated_at: string;
}

// Receipt Types
export interface Receipt {
  id: number;
  purchase_order: PurchaseOrder;
  document_url: string;
  extracted_data?: any;
  discrepancies?: any;
  status: 'PENDING' | 'VALIDATED' | 'REJECTED';
  uploaded_by: User;
  validated_by?: User;
  validated_at?: string;
  created_at: string;
  updated_at: string;
}

// Analytics Types
export interface SpendingByVendor {
  vendor_name: string;
  total: number;
}

export interface MonthlySpending {
  month: string;
  total: number;
}

export interface DashboardStats {
  total_requests: number;
  pending_approvals: number;
  total_spent: number;
  active_pos: number;
}

export interface AnalyticsData {
  stats: DashboardStats;
  spending_by_vendor: SpendingByVendor[];
  monthly_spending: MonthlySpending[];
}

// API Response Types
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface APIError {
  error: string;
  details?: Record<string, string[]>;
}

// Notification Types
export interface Notification {
  id: number;
  user: User;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  is_read: boolean;
  created_at: string;
}

// Form Types
export interface FormErrors {
  [key: string]: string;
}

// Toast Types
export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}
