import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import api, { attachRetryInterceptor } from '../client';
import { API_V1 } from '../base';

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
  baseURL: API_V1,
  headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Same transient-failure retry as the main client; keeps `status` so the admin
// panel can still detect an expired token (401).
attachRetryInterceptor(adminApi, (error, err) => {
  (error as Error & { status?: number }).status = err.response?.status;
  return error;
});

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

/** MONTHLY = ₹5,000/month · YEARLY = ₹40,000/year. No setup fee on either. */
export type BillingPlan = 'MONTHLY' | 'YEARLY';

export function useValidateCoupon() {
  return useMutation({
    mutationFn: async ({ code, plan }: { code: string; plan: BillingPlan }) => {
      const res = await api.post('/billing/coupon/validate', { code, plan });
      return res.data.data;
    },
  });
}

/** Full-price first-payment quote for a plan: already reflects any paid trial credit. */
export function useOnboardingQuote(plan: BillingPlan) {
  return useQuery({
    queryKey: ['billing', 'onboarding-quote', plan],
    queryFn: async () => {
      const res = await api.get('/billing/onboarding/quote', { params: { plan } });
      return res.data.data;
    },
  });
}

export function useCreateOnboardingCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, plan }: { code?: string; plan: BillingPlan }) => {
      const res = await api.post('/billing/checkout/onboarding', { code: code ?? '', plan });
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

/** STARTER = ₹5,000 · 15 days · STANDARD = ₹10,000 · 10 days */
export type TrialTier = 'STARTER' | 'STANDARD';

export function useCreateTrialCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tier: TrialTier = 'STANDARD') => {
      const res = await api.post('/billing/checkout/trial', { tier });
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

export function useAdminCallerNumbers(id: string) {
  return useQuery({
    queryKey: ['admin', 'tenants', id, 'caller-numbers'],
    queryFn: async () => {
      const res = await adminApi.get(`/admin/tenants/${id}/caller-numbers`);
      return res.data.data;
    },
    enabled: !!id,
    // A test call's ring/answer result arrives by webhook a few seconds later
    refetchInterval: 10_000,
  });
}

export function useAdminVerifyCallerNumbers(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.post(`/admin/tenants/${id}/caller-numbers/verify`),
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin', 'tenants', id, 'caller-numbers'] }),
  });
}

export function useAdminTestCallerNumber(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { phone: string; to: string }) =>
      adminApi.post(`/admin/tenants/${id}/caller-numbers/test`, data),
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin', 'tenants', id, 'caller-numbers'] }),
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

// ─── Admin: demo voice agents ──────────────────────────────────────────────

export function useAdminDemoAgents() {
  return useQuery({
    queryKey: ['admin', 'demo-agents'],
    queryFn: async () => {
      const res = await adminApi.get('/admin/demo-agents');
      return res.data.data;
    },
  });
}

export function useAdminDemoAgentStyles() {
  return useQuery({
    queryKey: ['admin', 'demo-agent-styles'],
    queryFn: async () => {
      const res = await adminApi.get('/admin/demo-agents/styles');
      return res.data.data as { slug: string; label: string }[];
    },
    staleTime: 10 * 60_000,
  });
}

export type DemoAgentInput = {
  name?: string;
  description?: string;
  bolnaAgentId?: string;
  scriptStyle?: string;
  voiceLabel?: string;
  active?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
};

export function useAdminCreateDemoAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DemoAgentInput) => adminApi.post('/admin/demo-agents', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'demo-agents'] }),
  });
}

export function useAdminUpdateDemoAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: DemoAgentInput & { id: string }) =>
      adminApi.patch(`/admin/demo-agents/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'demo-agents'] }),
  });
}

export function useAdminDeleteDemoAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.delete(`/admin/demo-agents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'demo-agents'] }),
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
// ─── Prepaid credits ──────────────────────────────────────────────────────────

/** Balances, packs for the business's AI model, autopay state, ledger. */
export function useCredits() {
  return useQuery({
    queryKey: ['billing', 'credits'],
    queryFn: async () => {
      const res = await api.get('/billing/credits');
      return res.data.data;
    },
    staleTime: 15_000,
  });
}

export function useSetCreditThresholds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { call?: number; whatsapp?: number }) => api.patch('/billing/credits/thresholds', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}

export function useCreateCreditCheckout() {
  return useMutation({
    mutationFn: async (pack_id: string) => {
      const res = await api.post('/billing/credits/checkout', { pack_id });
      return res.data.data;
    },
  });
}

/** Verifies a manual purchase or an autopay setup payment. */
export function useVerifyCreditCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { order_id: string; payment_id: string; signature: string }) =>
      api.post('/billing/credits/verify', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}

export function useSetupAutopay() {
  return useMutation({
    mutationFn: async (data: { call_pack: string | null; whatsapp_pack: string | null; method: 'upi' | 'card' }) => {
      const res = await api.post('/billing/credits/autopay', data);
      return res.data.data;
    },
  });
}

export function useUpdateAutopayPacks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { call_pack?: string | null; whatsapp_pack?: string | null }) =>
      api.patch('/billing/credits/autopay', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}

export function useDisableAutopay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/billing/credits/autopay'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}

/** Mock mode only: settle a pending credits order without Razorpay. */
export function useSimulateCreditsPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (order_id: string) => api.post('/billing/dev/simulate-credits-paid', { order_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}

// ─── AI model (A best, B 2nd best, C 3rd best) ───────────────────────────────

export function useCallModel() {
  return useQuery({
    queryKey: ['call-model'],
    queryFn: async () => {
      const res = await api.get('/call-model');
      return res.data.data;
    },
  });
}

/** Platform-owner logins only (the backend refuses everyone else). */
export function useSetCallModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tier: 'A' | 'B' | 'C') => api.patch('/call-model', { tier }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['call-model'] });
      qc.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

// ─── Admin: AI models + tenant credits ────────────────────────────────────────

export function useAdminModelTiers() {
  return useQuery({
    queryKey: ['admin', 'models'],
    queryFn: async () => {
      const res = await adminApi.get('/admin/models');
      return res.data.data;
    },
  });
}

export function useAdminUpdateModelTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tier, ...data }: { tier: string; label?: string; description?: string; demoAgentId?: string; active?: boolean }) =>
      adminApi.patch(`/admin/models/${tier}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'models'] }),
  });
}

export function useAdminAdjustCredits(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { kind: 'CALL' | 'WHATSAPP'; delta: number; note?: string }) =>
      adminApi.post(`/admin/tenants/${id}/credits`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tenants', id] });
      qc.invalidateQueries({ queryKey: ['admin', 'tenant-credits', id] });
    },
  });
}

export function useAdminCreditHistory(id: string) {
  return useQuery({
    queryKey: ['admin', 'tenant-credits', id],
    queryFn: async () => {
      const res = await adminApi.get(`/admin/tenants/${id}/credits`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function formatPaise(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return '-';
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
