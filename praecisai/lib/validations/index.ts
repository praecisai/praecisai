import { z } from 'zod';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const onboardSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
});

// ─── Customer ─────────────────────────────────────────────────────────────────

export const createCustomerSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  city: z.string().optional(),
  tags: z.array(z.string()).optional(),
  is_vip: z.boolean().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

// ─── Invoice ──────────────────────────────────────────────────────────────────

export const createInvoiceSchema = z.object({
  customer_id: z.string().uuid(),
  invoice_number: z.string().min(1),
  invoice_date: z.string(),
  amount: z.number(),
  due_amount: z.number(),
  days_overdue: z.number().int().min(0),
  sales_agent: z.string().optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

// ─── Import ───────────────────────────────────────────────────────────────────

const targetFields = [
  'customer_name', 'city', 'invoice_number', 'invoice_date',
  'sales_agent', 'due_amount', 'days_overdue', 'phone', 'call_status',
] as const;

export const columnMappingSchema = z.object({
  target_field: z.enum(targetFields),
  source_column: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
});

export const importMapSchema = z.object({
  history_id: z.string().uuid(),
  mappings: z.array(columnMappingSchema).min(1, 'At least one column mapping required'),
});

export const importExecuteSchema = z.object({
  history_id: z.string().uuid(),
  mappings: z.array(columnMappingSchema).min(2, 'At least customer_name and invoice_number must be mapped'),
  template_name: z.string().optional(),
});

export const saveTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  mappings: z.array(columnMappingSchema).min(1),
});

// ─── Promise to Pay ───────────────────────────────────────────────────────────

export const createPTPSchema = z.object({
  customer_id: z.string().uuid(),
  promised_amount: z.number().positive(),
  promised_date: z.string(),
  notes: z.string().optional(),
});

export type CreatePTPInput = z.infer<typeof createPTPSchema>;

// ─── Pagination ───────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
