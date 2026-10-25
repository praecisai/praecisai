'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { TopHeader } from '../../../components/layout/Sidebar';
import { BillingBanners } from '../../../components/shared/BillingBanners';
import { Select } from '../../../components/ui/Select';
import {
  useBillingSummary,
  useBillingUsage,
  useBillingPlatforms,
  useInvoicePdf,
  useSimulateMonthlyCharge,
  formatPaise,
} from '../../../lib/api/hooks';
import {
  CreditCard, PhoneCall, MessageCircle, Wallet, Download,
  ExternalLink, CalendarClock, BadgeCheck, AlertTriangle, FlaskConical, PlayCircle, Search,
} from 'lucide-react';

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '-';
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

const SUB_STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#2E7D32',
  PENDING: '#B8860B',
  HALTED: '#C62828',
  CANCELLED: '#6B7280',
};

function monthOptions(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    out.push({ value, label });
  }
  return out;
}

export default function BillingPage() {
  const { data: summary, isLoading } = useBillingSummary();
  const [month, setMonth] = useState<string>(monthOptions()[0].value);
  const { data: usage, isLoading: usageLoading } = useBillingUsage(month);
  const { data: platforms } = useBillingPlatforms();
  const pdf = useInvoicePdf();
  const simulateCharge = useSimulateMonthlyCharge();
  // Per-call table filters (client-side, over the month's calls)
  const [callSearch, setCallSearch] = useState('');
  const [onlyRecorded, setOnlyRecorded] = useState(false);
  const perCall: any[] = usage?.platforms?.bolna?.per_call ?? [];
  const recordedCount = perCall.filter((c) => c.recording_url).length;
  const visibleCalls = perCall.filter(
    (c) =>
      (!onlyRecorded || c.recording_url) &&
      (!callSearch.trim() || String(c.customer).toLowerCase().includes(callSearch.trim().toLowerCase())),
  );

  const sub = summary?.subscription;
  const onboarding = summary?.onboarding_payment;
  const needsOnboarding =
    !isLoading && summary && !['PAID', 'ACTIVE'].includes(summary.onboarding_status);

  async function openInvoice(id: string) {
    try {
      const { url } = await pdf.mutateAsync(id);
      window.open(url, '_blank');
    } catch (err: any) {
      toast.error(err.message || 'Could not open invoice');
    }
  }

  return (
    <>
      <TopHeader title="Billing & Usage" subtitle="Praecis subscription · monthly usage · connected platforms" />
      <div className="p-4 sm:p-6 space-y-5">
        <BillingBanners />

        {needsOnboarding && (
          <div
            className="glass-card p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
            style={{ borderLeft: '4px solid var(--mahogany)' }}
          >
            <div>
              <p className="font-semibold text-[var(--dark-brown)]">Choose your plan</p>
              <p className="text-sm text-[var(--walnut)] mt-1">
                ₹5,000 per month, or ₹40,000 per year (save ₹20,000). No setup fee, no GST. Apply a discount coupon if you have one.
              </p>
            </div>
            <Link
              href="/dashboard/billing/onboarding"
              className="btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold text-center"
              style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
            >
              Pick a plan
            </Link>
          </div>
        )}

        {/* ── a. Praecis subscription ─────────────────────────────────── */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-[var(--mahogany)]" />
            <h2 className="font-semibold text-[var(--dark-brown)]">Praecis Subscription</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl" style={{ background: 'var(--sand)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--walnut)]">Next auto-debit</p>
              <p className="text-lg font-bold text-[var(--dark-brown)] mt-1 flex items-center gap-2">
                <CalendarClock size={16} className="text-[var(--mahogany)]" />
                {sub?.next_debit_date ? fmtDate(sub.next_debit_date) : '-'}
              </p>
              <p className="text-xs text-[var(--walnut)] mt-1">
                {sub?.plan === 'YEARLY' ? '₹40,000 per year, no GST' : '₹5,000 per month, no GST'}
              </p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'var(--sand)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--walnut)]">Mandate status</p>
              <p className="mt-1">
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-semibold inline-block"
                  style={{
                    background: `${SUB_STATUS_COLORS[sub?.status] ?? '#6B7280'}18`,
                    color: SUB_STATUS_COLORS[sub?.status] ?? '#6B7280',
                    border: `1px solid ${SUB_STATUS_COLORS[sub?.status] ?? '#6B7280'}40`,
                  }}
                >
                  {sub?.status ?? 'NOT SET UP'}
                </span>
              </p>
              <p className="text-xs text-[var(--walnut)] mt-2">
                {sub?.mandate_type ? `Auto-debit via ${String(sub.mandate_type).toUpperCase()}` : 'UPI Autopay or card mandate'}
              </p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'var(--sand)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--walnut)]">First payment</p>
              {onboarding ? (
                <>
                  <p className="text-lg font-bold text-[var(--dark-brown)] mt-1 flex items-center gap-2">
                    <BadgeCheck size={16} style={{ color: '#2E7D32' }} />
                    {formatPaise(onboarding.total_amount)}
                  </p>
                  <p className="text-xs text-[var(--walnut)] mt-1">
                    {onboarding.setup_component > 0
                      ? `Setup ${formatPaise(onboarding.setup_component)} · First month ${formatPaise(onboarding.subscription_component)}`
                      : sub?.plan === 'YEARLY'
                        ? 'Yearly plan · first 12 months · no setup fee'
                        : 'Monthly plan · first month · no setup fee'}
                    {onboarding.gst_amount > 0 ? ` · GST ${formatPaise(onboarding.gst_amount)}` : ''}
                    {onboarding.trial_credit_amount > 0 ? ` · Trial adjusted -${formatPaise(onboarding.trial_credit_amount)}` : ''}
                    {onboarding.coupon ? ` · Coupon ${onboarding.coupon.code} (${onboarding.coupon.percent}%)` : ''}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[var(--walnut)] mt-2">Not paid yet</p>
              )}
            </div>
          </div>

          {/* Invoices */}
          <div className="mt-5">
            <p className="text-sm font-semibold text-[var(--dark-brown)] mb-2">Invoices</p>
            {summary?.invoices?.length ? (
              <div className="overflow-x-auto">
                <table className="data-table w-full min-w-[560px]">
                  <thead>
                    <tr>
                      <th className="text-left">Invoice No</th>
                      <th className="text-left">Type</th>
                      <th className="text-left">Date</th>
                      <th className="text-right">Total</th>
                      <th className="text-right">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.invoices.map((inv: any) => (
                      <tr key={inv.id}>
                        <td className="text-sm font-medium text-[var(--dark-brown)]">{inv.invoice_number}</td>
                        <td className="text-xs text-[var(--walnut)]">
                          {inv.payment?.type === 'ONBOARDING'
                            ? 'First payment'
                            : inv.payment?.type === 'TRIAL'
                              ? 'Trial (10 days)'
                              : 'Subscription'}
                        </td>
                        <td className="text-xs text-[var(--walnut)]">{fmtDate(inv.created_at)}</td>
                        <td className="text-right text-sm font-semibold text-[var(--dark-brown)]">{formatPaise(inv.total)}</td>
                        <td className="text-right">
                          <button
                            onClick={() => openInvoice(inv.id)}
                            className="p-1.5 rounded-md text-[var(--walnut)] hover:text-[var(--mahogany)]"
                            title="Download invoice PDF"
                          >
                            <Download size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[var(--walnut)]">No invoices yet</p>
            )}
          </div>
        </div>

        {/* ── b. Usage this month ─────────────────────────────────────── */}
        <div className="glass-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <PhoneCall size={18} className="text-[var(--mahogany)]" />
              <h2 className="font-semibold text-[var(--dark-brown)]">Usage: {monthOptions().find((m) => m.value === month)?.label}</h2>
            </div>
            <Select
              value={month}
              onChange={setMonth}
              className="w-48"
              searchable={false}
              options={monthOptions()}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'AI calls made', value: usage?.platforms?.bolna?.calls_made ?? '-' },
              { label: 'Total minutes', value: usage?.platforms?.bolna?.total_minutes ?? '-' },
              { label: 'WhatsApp messages', value: usage?.platforms?.aisensy?.messages_sent ?? '-' },
              {
                label: 'Bolna spend (est.)',
                value: usage?.platforms?.bolna?.est_spend_usd != null ? `$${usage.platforms.bolna.est_spend_usd}` : '-',
              },
            ].map((card) => (
              <div key={card.label} className="p-4 rounded-xl" style={{ background: 'var(--sand)' }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--walnut)]">{card.label}</p>
                <p className="text-xl font-bold text-[var(--dark-brown)] mt-1">{usageLoading ? '…' : card.value}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-[var(--walnut)] mt-3">
            Praecis fees this month: {formatPaise(usage?.praecis?.total_paise ?? 0)} · Bolna and AiSensy spend is billed to you directly by those platforms, not by Praecis.
          </p>

          {perCall.length > 0 && (
            <details className="mt-3" open>
              <summary className="text-sm font-medium text-[var(--mahogany)] cursor-pointer">
                Per-call detail ({perCall.length} calls · {recordedCount} with recording)
              </summary>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--walnut)]" />
                  <input
                    value={callSearch}
                    onChange={(e) => setCallSearch(e.target.value)}
                    placeholder="Search customer"
                    className="pl-8 pr-3 py-1.5 rounded-lg border text-xs bg-transparent text-[var(--dark-brown)]"
                    style={{ borderColor: 'var(--caramel)' }}
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none text-[var(--dark-brown)]">
                  <input type="checkbox" checked={onlyRecorded} onChange={(e) => setOnlyRecorded(e.target.checked)} />
                  Only calls with a recording
                </label>
                {visibleCalls.length !== perCall.length && (
                  <span className="text-xs text-[var(--walnut)]">Showing {visibleCalls.length} of {perCall.length}</span>
                )}
              </div>
              <div className="overflow-x-auto mt-2">
                <table className="data-table w-full min-w-[680px]">
                  <thead>
                    <tr>
                      <th className="text-left">Date</th>
                      <th className="text-left">Customer</th>
                      <th className="text-left">Status</th>
                      <th className="text-right">Duration</th>
                      <th className="text-right">Bolna cost</th>
                      <th className="text-right">Recording</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCalls.map((c: any) => (
                      <tr key={c.id}>
                        <td className="text-xs text-[var(--walnut)]">{fmtDate(c.at)}</td>
                        <td className="text-sm text-[var(--dark-brown)]">{c.customer}</td>
                        <td className="text-xs text-[var(--walnut)]">{c.status}</td>
                        <td className="text-right text-xs text-[var(--walnut)]">
                          {c.duration_seconds != null ? `${Math.round(c.duration_seconds / 6) / 10} min` : '-'}
                        </td>
                        <td className="text-right text-xs text-[var(--walnut)]">
                          {c.cost_usd != null ? `$${c.cost_usd.toFixed(3)}` : '-'}
                        </td>
                        <td className="text-right text-xs">
                          {c.recording_url ? (
                            <a
                              href={c.recording_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-[var(--mahogany)] hover:underline underline-offset-2"
                            >
                              <PlayCircle size={13} /> Listen
                            </a>
                          ) : (
                            <span className="text-[var(--walnut)]">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>

        {/* ── c. Connected platforms ──────────────────────────────────── */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={18} className="text-[var(--mahogany)]" />
            <h2 className="font-semibold text-[var(--dark-brown)]">Connected Platforms</h2>
          </div>
          <p className="text-xs text-[var(--walnut)] mb-4">
            These are your own accounts: you pay Bolna and AiSensy directly on their platforms. Praecis only tracks the balances for you.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bolna */}
            <div
              className="p-4 rounded-xl border"
              style={{
                background: 'var(--sand)',
                borderColor: platforms?.bolna?.low ? '#E6510060' : 'transparent',
              }}
            >
              {platforms?.bolna?.low && (
                <div
                  className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg mb-3"
                  style={{ background: '#E6510018', color: '#E65100' }}
                >
                  <AlertTriangle size={14} />
                  Balance is below your ${platforms?.bolna?.threshold_usd} alert threshold: calls stop when it runs out
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[var(--dark-brown)] flex items-center gap-2">
                    <PhoneCall size={15} className="text-[var(--mahogany)]" /> Bolna · AI Calling
                  </p>
                  <p className="text-2xl font-bold text-[var(--dark-brown)] mt-2">
                    {platforms?.bolna?.balance_usd != null ? `$${platforms.bolna.balance_usd.toFixed(2)}` : '-'}
                  </p>
                  <p className="text-[11px] text-[var(--walnut)] mt-0.5">
                    {platforms?.bolna?.connected ? (
                      `Balance as of ${platforms?.bolna?.captured_at ? fmtDate(platforms.bolna.captured_at) : '-'}`
                    ) : (
                      'Not connected yet · contact the PraecisAI team to link your account'
                    )}
                  </p>
                </div>
              </div>
              <a
                href={platforms?.bolna?.topup_url ?? 'https://platform.bolna.ai'}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
              >
                Add funds on Bolna <ExternalLink size={13} />
              </a>
              <p className="text-[11px] text-[var(--walnut)] mt-2">Paid directly to Bolna, not to Praecis</p>
            </div>

            {/* AiSensy */}
            <div className="p-4 rounded-xl" style={{ background: 'var(--sand)' }}>
              <p className="font-semibold text-[var(--dark-brown)] flex items-center gap-2">
                <MessageCircle size={15} className="text-[var(--mahogany)]" /> AiSensy · WhatsApp
              </p>
              <p className="text-2xl font-bold text-[var(--dark-brown)] mt-2">
                {platforms?.aisensy?.messages_this_month ?? '-'}
              </p>
              <p className="text-[11px] text-[var(--walnut)] mt-0.5">
                {platforms?.aisensy?.connected ? (
                  'messages sent this month · account connected'
                ) : (
                  'messages sent this month · contact the PraecisAI team to link your account'
                )}
              </p>
              <a
                href={platforms?.aisensy?.dashboard_url ?? 'https://www.app.aisensy.com'}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
              >
                Manage AiSensy plan <ExternalLink size={13} />
              </a>
              <p className="text-[11px] text-[var(--walnut)] mt-2">Plan and credits are paid directly to AiSensy</p>
            </div>
          </div>
        </div>

        {/* Test-mode helper: only meaningful while Razorpay runs in mock mode */}
        {sub && (
          <div className="glass-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
            <p className="text-xs text-[var(--walnut)] flex items-center gap-2">
              <FlaskConical size={14} /> Test mode helper: simulate the next monthly auto-debit (works only while Razorpay keys are not configured)
            </p>
            <button
              onClick={() =>
                simulateCharge.mutate(undefined, {
                  onSuccess: () => toast.success('Monthly charge simulated'),
                  onError: (e: any) => toast.error(e.message),
                })
              }
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border text-[var(--mahogany)]"
              style={{ borderColor: 'var(--caramel)' }}
            >
              Simulate monthly debit
            </button>
          </div>
        )}
      </div>
    </>
  );
}
