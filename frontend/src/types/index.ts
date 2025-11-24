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
  date_joined?: string;
  is_verified?: boolean;
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
  role?: UserRole;
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
export type PurchaseRequestStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED_L1'
  | 'APPROVED_L2'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED';

export interface RequestItem {
  id?: number;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  unit_of_measure?: string;
  notes?: string;
  subtotal?: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface ExtractedDocumentData {
  vendor_name?: string | null;
  items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
  total_amount?: number | null;
  invoice_number?: string | null;
  date?: string | null;
  success?: boolean;
  error?: string;
}

export interface PurchaseRequest {
  id: number;
  requester: User;
  requester_id?: number;
  title: string;
  vendor_name?: string;
  description?: string;
  status: PurchaseRequestStatus;
  status_display?: string;
  total_amount: number | string;
  items: RequestItem[];

  // Document fields
  document_file?: string | null;
  extracted_data?: ExtractedDocumentData | null;
  document_processed?: boolean;

  // Approval tracking
  approved_l1_by?: User | null;
  approved_l1_at?: string | null;
  approved_l2_by?: User | null;
  approved_l2_at?: string | null;

  // Rejection tracking
  rejected_by?: User | null;
  rejected_at?: string | null;
  rejection_reason?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  submitted_at?: string | null;
}

export interface PurchaseRequestListItem {
  id: number;
  requester: User;
  title: string;
  description?: string;
  status: PurchaseRequestStatus;
  status_display: string;
  total_amount: number | string;
  item_count: number;
  created_at: string;
  submitted_at?: string | null;
}

export interface CreatePurchaseRequestData {
  title: string;
  vendor_name?: string;
  description?: string;
  status?: PurchaseRequestStatus;
  items: Omit<RequestItem, 'id' | 'subtotal' | 'created_at' | 'updated_at'>[];
}

export interface UpdatePurchaseRequestData extends CreatePurchaseRequestData {
  id: number;
}

// Approval Types
export interface Approval {
  id: number;
  purchase_request: PurchaseRequest;
  level: 1 | 2;
  approver?: User;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comments?: string;
  processed_at?: string;
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
export type ReceiptValidationStatus = 'PENDING' | 'MATCHED' | 'DISCREPANCY' | 'APPROVED';

export interface ReceiptDiscrepancy {
  type: 'vendor_mismatch' | 'amount_mismatch' | 'item_count_mismatch' | 'missing_item' | 'extra_item';
  severity: 'low' | 'medium' | 'high';
  message: string;
  po_value?: any;
  receipt_value?: any;
  difference?: number;
  po_item?: string;
  receipt_item?: string;
  po_quantity?: number;
  receipt_quantity?: number;
  po_unit_price?: number;
  receipt_unit_price?: number;
}

export interface Receipt {
  id: number;
  purchase_order: number;
  purchase_order_number?: string;
  purchase_order_details?: PurchaseOrder;
  request_title?: string;
  total_amount?: number | string;
  receipt_file: string;
  receipt_url: string;
  uploaded_by: number;
  uploaded_by_name?: string;
  uploaded_at: string;
  validation_status: ReceiptValidationStatus;
  validation_status_display: string;
  extracted_receipt_data?: ExtractedDocumentData | null;
  discrepancies?: ReceiptDiscrepancy[] | null;
  finance_comments?: string;
  approved_by?: number | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReceiptData {
  purchase_order: number;
  receipt_file: File;
}

export interface ReceiptApprovalData {
  finance_comments?: string;
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
