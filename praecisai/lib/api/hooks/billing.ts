import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../client';

// ─── Client billing ───────────────────────────────────────────────────────────

export function useBillingSummary() {
  return useQuery({
    queryKey: ['billing', 'summary'],
    queryFn: async () => {
      const res = await api.get('/billing/summary');
      return res.data.data;
    },
    staleTime: 30_000,
  });
}

export function useBillingUsage(month?: string) {
  return useQuery({
    queryKey: ['billing', 'usage', month ?? 'current'],
    queryFn: async () => {
      const res = await api.get('/billing/usage', { params: month ? { month } : {} });
      return res.data.data;
    },
  });
}

export function useBillingPlatforms() {
  return useQuery({
    queryKey: ['billing', 'platforms'],
    queryFn: async () => {
      const res = await api.get('/billing/platforms');
      return res.data.data;
    },
    staleTime: 60_000,
  });
}

export function useBillingNotifications() {
  return useQuery({
    queryKey: ['billing', 'notifications'],
    queryFn: async () => {
      const res = await api.get('/billing/notifications');
      return res.data.data;
    },
  });
}

export function useMarkBillingNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/billing/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: async (code: string) => {
      const res = await api.post('/billing/coupon/validate', { code });
      return res.data.data;
    },
  });
}

export function useCreateOnboardingCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const res = await api.post('/billing/checkout/onboarding', { code });
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}

export function useInvoicePdf() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.get(`/billing/invoices/${id}/pdf`);
      return res.data.data as { url: string };
    },
  });
}

// Mock-mode simulators (backend rejects these once real Razorpay keys exist)
export function useSimulateOnboardingPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/billing/dev/simulate-onboarding-paid'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}

export function useSimulateMonthlyCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/billing/dev/simulate-monthly-charge'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}

export function useSimulateMandateFailure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/billing/dev/simulate-mandate-failure'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export function useAdminMe() {
  return useQuery({
    queryKey: ['admin', 'me'],
    queryFn: async () => {
      const res = await api.get('/admin/me');
      return res.data.data;
    },
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useAdminTenants() {
  return useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: async () => {
      const res = await api.get('/admin/tenants');
      return res.data.data;
    },
  });
}

export function useAdminTenant(id: string) {
  return useQuery({
    queryKey: ['admin', 'tenants', id],
    queryFn: async () => {
      const res = await api.get(`/admin/tenants/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useAdminCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/admin/tenants', data);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
  });
}

export function useAdminUpdateTenant(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.patch(`/admin/tenants/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
  });
}

export function useAdminToggleTestCall(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (passed: boolean) => api.patch(`/admin/tenants/${id}/test-call`, { passed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
  });
}

export function useAdminLinkUsers(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/admin/tenants/${id}/link-users`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
  });
}

export function useAdminPollBolna(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/admin/tenants/${id}/poll-bolna`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
  });
}

export function useAdminNotifications(tenantId?: string) {
  return useQuery({
    queryKey: ['admin', 'notifications', tenantId ?? 'all'],
    queryFn: async () => {
      const res = await api.get('/admin/notifications', {
        params: tenantId ? { tenantId } : {},
      });
      return res.data.data;
    },
  });
}

export function useAdminMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/admin/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'notifications'] }),
  });
}

export function useAdminCoupons() {
  return useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: async () => {
      const res = await api.get('/admin/coupons');
      return res.data.data;
    },
  });
}

export function useAdminCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string; percent: number; maxUses?: number; expiresAt?: string }) =>
      api.post('/admin/coupons', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  });
}

export function useAdminSetCouponActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/admin/coupons/${id}/active`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  });
}

export function useAdminBilling() {
  return useQuery({
    queryKey: ['admin', 'billing'],
    queryFn: async () => {
      const res = await api.get('/admin/billing');
      return res.data.data;
    },
  });
}

export function useAdminInvoicePdf() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.get(`/admin/billing/invoices/${id}/pdf`);
      return res.data.data as { url: string };
    },
  });
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Paise → "₹1,234.56" (UI can use the rupee glyph; PDFs cannot). */
export function formatPaise(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return '-';
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
