import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../client';
import type { DashboardStats, CustomerFilters, InvoiceFilters, OutstandingFilters, ColumnMapping } from '../../../types';

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const res = await api.get('/dashboard/stats');
      return res.data.data;
    },
    staleTime: 60_000,
  });
}

export function useDashboardActivity() {
  return useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: async () => {
      const res = await api.get('/dashboard/activity?limit=10');
      return res.data.data;
    },
  });
}

// ─── Customers ────────────────────────────────────────────────────────────────

export function useCustomers(filters: CustomerFilters = {}) {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: async () => {
      const res = await api.get('/customers', { params: filters });
      return res.data.data;
    },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: async () => {
      const res = await api.get(`/customers/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCustomerCities() {
  return useQuery({
    queryKey: ['customers', 'cities'],
    queryFn: async (): Promise<string[]> => {
      const res = await api.get('/customers/cities');
      return res.data.data ?? [];
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/customers', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.patch(`/customers/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customers', id] });
    },
  });
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export function useInvoices(filters: InvoiceFilters = {}) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      const res = await api.get('/invoices', { params: filters });
      return res.data.data;
    },
  });
}

export function useCustomerInvoices(customerId: string) {
  return useQuery({
    queryKey: ['invoices', 'customer', customerId],
    queryFn: async () => {
      const res = await api.get(`/invoices/customer/${customerId}`);
      return res.data.data;
    },
    enabled: !!customerId,
  });
}

// ─── Outstandings ─────────────────────────────────────────────────────────────

export function useOutstandings(filters: OutstandingFilters = {}) {
  return useQuery({
    queryKey: ['outstandings', filters],
    queryFn: async () => {
      const res = await api.get('/outstandings', { params: filters });
      return res.data.data;
    },
  });
}

export function useAgingBreakdown() {
  return useQuery({
    queryKey: ['outstandings', 'aging'],
    queryFn: async () => {
      const res = await api.get('/outstandings/aging-breakdown');
      return res.data.data;
    },
  });
}

// ─── Import ───────────────────────────────────────────────────────────────────

export function useImportHistory(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['import', 'history', page, limit],
    queryFn: async () => {
      const res = await api.get('/import/history', { params: { page, limit } });
      return res.data.data;
    },
  });
}

export function useImportTemplates() {
  return useQuery({
    queryKey: ['import', 'templates'],
    queryFn: async () => {
      const res = await api.get('/import/templates');
      return res.data.data ?? [];
    },
  });
}

export function useUploadImport() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post('/import/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
  });
}

export function usePreviewImport() {
  return useMutation({
    mutationFn: (data: { history_id: string; mappings: ColumnMapping[] }) =>
      api.post('/import/map', data),
  });
}

export function useExecuteImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { history_id: string; mappings: ColumnMapping[]; template_name?: string }) =>
      api.post('/import/execute', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['outstandings'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['import', 'history'] });
    },
  });
}

export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; mappings: ColumnMapping[] }) =>
      api.post('/import/templates', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['import', 'templates'] }),
  });
}

// ─── Recovery actions (AI call + WhatsApp statement) ──────────────────────────

export function useCallCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => api.post(`/calling/call-customer/${customerId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outstandings'] }),
  });
}

export function useSendWhatsAppStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => api.post(`/whatsapp/send-statement/${customerId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outstandings'] }),
  });
}

export function useCallSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (segment: string) => api.post('/calling/call-segment', { segment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outstandings'] }),
  });
}

export function useSendSegmentStatements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (segment: string) => api.post('/whatsapp/send-segment', { segment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outstandings'] }),
  });
}

export function useUpdateBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; segment_rules?: Array<{ min_days: number; max_days: number | null; segment: string }> }) =>
      api.patch('/business/me', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      qc.invalidateQueries({ queryKey: ['outstandings'] });
    },
  });
}

export function useUpdateCustomerPhone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, phone }: { customerId: string; phone: string }) =>
      api.patch(`/customers/${customerId}`, { phone }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['outstandings'] });
    },
  });
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export function useCampaigns(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['campaigns', page, limit],
    queryFn: async () => {
      const res = await api.get('/campaigns', { params: { page, limit } });
      return res.data.data;
    },
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/campaigns', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function useMe() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.data;
    },
    retry: false,
  });
}

export function useOnboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { businessName: string }) => api.post('/auth/onboard', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth', 'me'] }),
  });
}
