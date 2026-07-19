import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import api from '../client';

// ─── Admin credential client ─────────────────────────────────────────────────
// The /admin panel authenticates with its own username/password token
// (POST /admin/login), fully independent of the Supabase user session.

const ADMIN_TOKEN_KEY = 'praecis_admin_token';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else window.localStorage.removeItem(ADMIN_TOKEN_KEY);
}

const adminApi = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error ?? err.response?.data?.message ?? err.message ?? 'An error occurred';
    const e = new Error(message) as Error & { status?: number };
    e.status = err.response?.status;
    return Promise.reject(e);
  },
);

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

// ─── Self-serve platform keys ─────────────────────────────────────────────────

/** Connection status + last-4 previews for the tenant's own Bolna/AiSensy keys. */
export function useTenantKeys() {
  return useQuery({
    queryKey: ['billing', 'keys'],
    queryFn: async () => {
      const res = await api.get('/billing/keys');
      return res.data.data as {
        bolna_connected: boolean;
        aisensy_connected: boolean;
        bolna_key_last4: string | null;
        bolna_agent_id: string | null;
        aisensy_key_last4: string | null;
      };
    },
  });
}

/** Save the tenant's own keys; on success credits/platforms refresh live. */
export function useSaveTenantKeys() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      bolnaApiKey?: string;
      bolnaAgentId?: string;
      aisensyApiKey?: string;
    }) => {
      const res = await api.patch('/billing/keys', data);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'credits'] });
    },
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
    mutationFn: async (code?: string) => {
      const res = await api.post('/billing/checkout/onboarding', { code: code ?? '' });
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

// ─── Paywall access + trial ───────────────────────────────────────────────────

/** Entitlement probe: allowlisted, paid, or in an active 1-week trial. */
export function useBillingAccess() {
  return useQuery({
    queryKey: ['billing', 'access'],
    queryFn: async () => {
      const res = await api.get('/billing/access');
      return res.data.data;
    },
    staleTime: 30_000,
    refetchInterval: 5 * 60_000, // catches trial expiry while the tab is open
  });
}

export function useCreateTrialCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/billing/checkout/trial');
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}

export function useSimulateTrialPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/billing/dev/simulate-trial-paid'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}

/** Server-side signature check after Razorpay Checkout succeeds in the browser. */
export function useVerifyTrialCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { order_id: string; payment_id: string; signature: string }) =>
      api.post('/billing/checkout/trial/verify', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}

export function useVerifyOnboardingCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { subscription_id: string; payment_id: string; signature: string }) =>
      api.post('/billing/checkout/onboarding/verify', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}

export function useAdminDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirmName }: { id: string; confirmName: string }) =>
      adminApi.delete(`/admin/tenants/${id}`, { data: { confirmName } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
  });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export function useAdminLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (creds: { username: string; password: string }) => {
      const res = await adminApi.post('/admin/login', creds);
      return res.data.data as { token: string; expires_at: string };
    },
    onSuccess: (data) => {
      setAdminToken(data.token);
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useAdminMe() {
  return useQuery({
    queryKey: ['admin', 'me'],
    queryFn: async () => {
      const res = await adminApi.get('/admin/me');
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
      const res = await adminApi.get('/admin/tenants');
      return res.data.data;
    },
  });
}

export function useAdminTenant(id: string) {
  return useQuery({
    queryKey: ['admin', 'tenants', id],
    queryFn: async () => {
      const res = await adminApi.get(`/admin/tenants/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useAdminCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await adminApi.post('/admin/tenants', data);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
  });
}

export function useAdminUpdateTenant(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => adminApi.patch(`/admin/tenants/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
  });
}

export function useAdminToggleTestCall(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (passed: boolean) => adminApi.patch(`/admin/tenants/${id}/test-call`, { passed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
  });
}

export function useAdminLinkUsers(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.post(`/admin/tenants/${id}/link-users`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
  });
}

export function useAdminPollBolna(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.post(`/admin/tenants/${id}/poll-bolna`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
  });
}

export function useAdminNotifications(tenantId?: string) {
  return useQuery({
    queryKey: ['admin', 'notifications', tenantId ?? 'all'],
    queryFn: async () => {
      const res = await adminApi.get('/admin/notifications', {
        params: tenantId ? { tenantId } : {},
      });
      return res.data.data;
    },
  });
}

export function useAdminMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.patch(`/admin/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'notifications'] }),
  });
}

export function useAdminCoupons() {
  return useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: async () => {
      const res = await adminApi.get('/admin/coupons');
      return res.data.data;
    },
  });
}

export function useAdminCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string; percent: number; maxUses?: number; expiresAt?: string }) =>
      adminApi.post('/admin/coupons', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  });
}

export function useAdminSetCouponActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      adminApi.patch(`/admin/coupons/${id}/active`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  });
}

export function useAdminBilling() {
  return useQuery({
    queryKey: ['admin', 'billing'],
    queryFn: async () => {
      const res = await adminApi.get('/admin/billing');
      return res.data.data;
    },
  });
}

export function useAdminInvoicePdf() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await adminApi.get(`/admin/billing/invoices/${id}/pdf`);
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
