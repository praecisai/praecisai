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

export function useDashboardActivity(limit = 10) {
  return useQuery({
    queryKey: ['dashboard', 'activity', limit],
    queryFn: async () => {
      const res = await api.get(`/dashboard/activity?limit=${limit}`);
      return res.data.data;
    },
  });
}

export function useBolnaCredits() {
  return useQuery({
    queryKey: ['dashboard', 'credits'],
    queryFn: async () => {
      const res = await api.get('/dashboard/credits');
      return res.data.data; // nestjs standard response if wrapped, wait, does dashboard service wrap in data? No, dashboard service returns data directly. Wait, the global interceptor wraps responses in { status: 'success', data: ... }
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

export function useCustomerAgents() {
  return useQuery({
    queryKey: ['customers', 'agents'],
    queryFn: async (): Promise<string[]> => {
      const res = await api.get('/customers/agents');
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
    // Optimistic: patch every cached customer list/detail instantly so
    // star/VIP toggles feel immediate; roll back if the server rejects.
    onMutate: async (data: any) => {
      await qc.cancelQueries({ queryKey: ['customers'] });
      const snapshots = qc.getQueriesData({ queryKey: ['customers'] });
      // Iterate each cached list ourselves (rather than setQueriesData's blind
      // updater) so we can read that query's own filter from its key and drop
      // the row when it no longer matches — e.g. un-starring on a VIP-only list
      // must make the row vanish immediately, not linger until a refetch.
      for (const [key, old] of snapshots) {
        if (!old) continue;
        const filters = (Array.isArray(key) && key[1] && typeof key[1] === 'object'
          ? (key[1] as Record<string, unknown>)
          : {});
        const stillMatches = (c: any) => {
          if (filters.is_vip === true && c.is_vip === false) return false;
          return true;
        };
        const o = old as any;
        if (Array.isArray(o?.data)) {
          const patched = o.data.map((c: any) => (c.id === id ? { ...c, ...data } : c));
          const kept = patched.filter(stillMatches);
          const removed = patched.length - kept.length;
          qc.setQueryData(key, {
            ...o,
            data: kept,
            ...(typeof o.total === 'number' ? { total: Math.max(0, o.total - removed) } : {}),
          });
        } else if (Array.isArray(o)) {
          qc.setQueryData(key, o.map((c: any) => (c.id === id ? { ...c, ...data } : c)));
        } else if (o?.id === id) {
          qc.setQueryData(key, { ...o, ...data });
        }
      }
      return { snapshots };
    },
    onError: (_err, _data, ctx: any) => {
      for (const [key, snapshot] of ctx?.snapshots ?? []) {
        qc.setQueryData(key, snapshot);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['outstandings'] });
    },
  });
}

// Excel with PARTY + VIP (Yes/No) columns → auto-stars matching customers
export function useVipImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post('/customers/vip-import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['outstandings'] });
    },
  });
}

// ─── Recovery reports ─────────────────────────────────────────────────────────

export function useRecoveryReport() {
  return useQuery({
    queryKey: ['reports', 'recovery'],
    queryFn: async () => {
      const res = await api.get('/reports/recovery');
      return res.data.data ?? res.data;
    },
    staleTime: 60_000,
  });
}

// Segments with counts/amounts + full party lists (drives the Escalation
// and Segment Overview report cards)
export function useSegmentOverview() {
  return useQuery({
    queryKey: ['reports', 'overview'],
    queryFn: async () => {
      const res = await api.get('/reports/overview');
      return res.data.data ?? res.data;
    },
    staleTime: 60_000,
  });
}

// Generic PDF download for the report endpoints
export function useDownloadReportPdf() {
  return useMutation({
    mutationFn: async ({ path, filename }: { path: string; filename: string }) => {
      const res = await api.get(path, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      const today = new Date();
      const stamp = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
      a.href = url;
      a.download = `${filename}_${stamp}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  });
}

export function useDownloadRecoveryPdf() {
  return useMutation({
    mutationFn: async (type: 'positive' | 'negative') => {
      const res = await api.get(`/reports/recovery/pdf?type=${type}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      const today = new Date();
      const stamp = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
      a.href = url;
      a.download = `${type}-recovery-report_${stamp}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
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

export function useSegmentBreakdown() {
  return useQuery({
    queryKey: ['outstandings', 'segments'],
    queryFn: async () => {
      const res = await api.get('/outstandings/segment-breakdown');
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
    mutationFn: (params: { segment: string; vipOnly?: boolean }) =>
      api.post('/calling/call-segment', params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outstandings'] }),
  });
}

export function useSendSegmentStatements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { segment: string; vipOnly?: boolean }) =>
      api.post('/whatsapp/send-segment', params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outstandings'] }),
  });
}

export function useUpdateBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name?: string;
      handoff_number?: string;
      segment_rules?: Array<{ min_days: number; max_days: number | null; segment: string }>;
      vip_rule?: { min_days: number; max_days: number | null; segment: string } | null;
      call_language?: 'HINDI' | 'ENGLISH';
      auto_calls_enabled?: boolean;
    }) => api.patch('/business/me', data),
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

// Billing, usage and admin hooks
export * from './billing';
