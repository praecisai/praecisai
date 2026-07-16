// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'MANAGER' | 'RECOVERY_AGENT';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type BusinessStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type BusinessPlan = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
export type InvoiceStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'DISPUTED';
export type OutstandingStatus = 'ACTIVE' | 'CLEARED' | 'DISPUTED' | 'WRITTEN_OFF';
export type CampaignType = 'WHATSAPP' | 'CALL' | 'EMAIL' | 'SMS';
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
export type ImportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type CallStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'NO_ANSWER' | 'BUSY';
export type DeliveryStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
export type PTPStatus = 'PENDING' | 'KEPT' | 'BROKEN' | 'RESCHEDULED';
export type Segment = 'Soft Reminder' | 'Follow-up' | 'Strong Follow-up' | 'Escalation' | 'Cleared' | 'Credit Note';

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface Business {
  id: string;
  name: string;
  status: BusinessStatus;
  plan: BusinessPlan;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  business_id: string;
  supabase_uid: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  customer_name: string;
  phone: string | null;
  alt_phones: string[];
  email: string | null;
  city: string | null;
  tags: string[];
  is_vip: boolean;
  assigned_agent: string | null;
  custom_schedule: SegmentRule[] | null;
  created_at: string;
  updated_at: string;
  // Relations
  invoices?: Invoice[];
  outstanding?: Outstanding;
}

export interface Invoice {
  id: string;
  business_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_date: string;
  amount: number;
  due_amount: number;
  days_overdue: number;
  sales_agent: string | null;
  status: InvoiceStatus;
  created_at: string;
  updated_at: string;
  // Relations
  customer?: Customer;
}

export interface Outstanding {
  id: string;
  business_id: string;
  customer_id: string;
  total_due: number;
  aging_bucket: string;
  segment: Segment;
  status: OutstandingStatus;
  created_at: string;
  updated_at: string;
  // Relations
  customer?: Customer;
}

export interface Campaign {
  id: string;
  business_id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppLog {
  id: string;
  business_id: string;
  customer_id: string;
  campaign_id: string | null;
  message: string;
  reply: string | null;
  delivery_status: DeliveryStatus;
  created_at: string;
}

export interface CallLog {
  id: string;
  business_id: string;
  customer_id: string;
  campaign_id: string | null;
  transcript: string | null;
  recording_url: string | null;
  call_status: CallStatus;
  duration_seconds: number | null;
  created_at: string;
}

export interface AIAnalysis {
  id: string;
  business_id: string;
  customer_id: string;
  sentiment: string | null;
  intent: string | null;
  risk_score: number | null;
  summary: string | null;
  created_at: string;
}

export interface PromiseToPay {
  id: string;
  business_id: string;
  customer_id: string;
  promised_amount: number;
  promised_date: string;
  status: PTPStatus;
  notes: string | null;
  created_at: string;
}

export interface ImportTemplate {
  id: string;
  business_id: string;
  name: string;
  mappings: Record<string, string>;
  created_at: string;
}

export interface ImportHistory {
  id: string;
  business_id: string;
  file_name: string;
  file_url: string;
  status: ImportStatus;
  records_total: number;
  records_imported: number;
  records_failed: number;
  error_log: ImportError[];
  created_at: string;
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  raw_value?: string;
}

// ─── API Types ────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ─── Dashboard Types ──────────────────────────────────────────────────────────

export interface AgingBucket {
  label: string;
  range: string;
  amount: number;
  count: number;
}

export interface SegmentCount {
  segment: Segment;
  count: number;
  amount: number;
}

export interface DashboardStats {
  total_outstanding: number;
  total_customers: number;
  total_invoices: number;
  active_campaigns: number;
  recovery_rate: number;
  aging_buckets: AgingBucket[];
  segment_distribution: SegmentCount[];
}

// ─── Import Types ─────────────────────────────────────────────────────────────

export type TargetField =
  | 'customer_name'
  | 'city'
  | 'invoice_number'
  | 'invoice_date'
  | 'sales_agent'
  | 'due_amount'
  | 'days_overdue'
  | 'phone'
  | 'call_status';

export interface ColumnMapping {
  target_field: TargetField;
  source_column: string;
  confidence?: number; // 0-1 fuzzy match confidence
}

export interface ImportUploadResponse {
  file_url: string;
  file_name: string;
  headers: string[];
  row_count: number;
  history_id: string;
}

export interface ImportMapRequest {
  history_id: string;
  mappings: ColumnMapping[];
}

export interface ImportPreviewRow {
  row_index: number;
  mapped: Partial<Record<TargetField, string>>;
  raw: Record<string, string>;
  errors: ImportError[];
}

export interface ImportMapResponse {
  preview: ImportPreviewRow[];
  validation_errors: ImportError[];
  total_rows: number;
}

export interface ImportExecuteRequest {
  history_id: string;
  mappings: ColumnMapping[];
  template_name?: string; // if user wants to save template
}

export interface ImportExecuteResponse {
  history_id: string;
  records_total: number;
  records_imported: number;
  records_failed: number;
  customers_created: number;
  customers_updated: number;
  invoices_created: number;
  outstanding_updated: number;
  errors: ImportError[];
}

// ─── Segment Rules ────────────────────────────────────────────────────────────

export interface SegmentRule {
  min_days: number;
  max_days: number | null; // null = infinity
  segment: Segment;
}

export const DEFAULT_SEGMENT_RULES: SegmentRule[] = [
  { min_days: 0, max_days: 60, segment: 'Soft Reminder' },
  { min_days: 61, max_days: 120, segment: 'Follow-up' },
  { min_days: 121, max_days: 180, segment: 'Strong Follow-up' },
  { min_days: 181, max_days: null, segment: 'Escalation' },
];

// ─── Filter Types ─────────────────────────────────────────────────────────────

export interface CustomerFilters extends PaginationParams {
  search?: string;
  city?: string;
  // Segment name, or 'VIP' (pseudo-segment = all VIP customers)
  segment?: string;
  agent?: string;
  tag?: string;
  is_vip?: boolean;
}

export interface InvoiceFilters extends PaginationParams {
  search?: string;
  status?: InvoiceStatus;
  sales_agent?: string;
  date_from?: string;
  date_to?: string;
}

export interface OutstandingFilters extends PaginationParams {
  segment?: Segment;
  aging_bucket?: string;
  status?: OutstandingStatus;
}
