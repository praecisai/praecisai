'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  useAdminCoupons,
  useAdminCreateCoupon,
  useAdminSetCouponActive,
} from '../../../lib/api/hooks';
import { Plus, TicketPercent } from 'lucide-react';
import { Select } from '../../../components/ui/Select';

export default function AdminCouponsPage() {
  const { data: coupons, isLoading } = useAdminCoupons();
  const create = useAdminCreateCoupon();
  const setActive = useAdminSetCouponActive();

  const [code, setCode] = useState('');
  const [percent, setPercent] = useState(10);
  const [expiresAt, setExpiresAt] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        code: code.trim().toUpperCase(),
        percent,
        maxUses: 2147483647, // effectively unlimited
        ...(expiresAt ? { expiresAt } : {}),
      },
      {
        onSuccess: () => {
          toast.success('Coupon created');
          setCode('');
        },
        onError: (err: any) => toast.error(err.message),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-[var(--dark-brown)]">Coupons</h1>
        <p className="text-xs text-[var(--walnut)]">
          Coupon codes give a percentage discount on the ₹50,000 onboarding fee (before GST). Coupons are optional at checkout.
        </p>
      </div>

      {/* Create */}
      <form onSubmit={submit} className="glass-card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-[var(--walnut)] uppercase mb-1">Code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="AEROMEN10"
            required
            className="px-3 py-2 rounded-lg text-sm border bg-[var(--surface-warm)] text-[var(--dark-brown)] w-40"
            style={{ borderColor: 'var(--caramel)' }}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[var(--walnut)] uppercase mb-1">Discount</label>
          <Select
            value={String(percent)}
            onChange={(v) => setPercent(Number(v))}
            className="w-28"
            options={[5, 10, 15, 20, 25, 30].map((p) => ({ value: String(p), label: `${p}% off` }))}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[var(--walnut)] uppercase mb-1">Expires (optional)</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border bg-[var(--surface-warm)] text-[var(--dark-brown)]"
            style={{ borderColor: 'var(--caramel)' }}
          />
        </div>
        <button
          type="submit"
          disabled={create.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
        >
          <Plus size={14} /> Create
        </button>
      </form>

      {/* List */}
      <div className="glass-card overflow-x-auto">
        {isLoading ? (
          <p className="text-sm text-[var(--walnut)] p-6 text-center">Loading coupons…</p>
        ) : (
          <table className="data-table w-full min-w-[580px]">
            <thead>
              <tr>
                <th className="text-left">Code</th>
                <th className="text-right">Discount</th>
                <th className="text-right">Used</th>
                <th className="text-left">Expires</th>
                <th className="text-left">Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {(coupons ?? []).map((c: any) => (
                <tr key={c.id}>
                  <td className="text-sm font-semibold text-[var(--dark-brown)]">
                    <span className="inline-flex items-center gap-1.5">
                      <TicketPercent size={14} className="text-[var(--mahogany)]" /> {c.code}
                    </span>
                  </td>
                  <td className="text-right text-sm text-[var(--dark-brown)]">{c.percent}% off</td>
                  <td className="text-right text-sm text-[var(--walnut)]">
                    {c.used_count} <span className="text-[11px] text-[var(--walnut)]">/ Unlimited</span>
                  </td>
                  <td className="text-xs text-[var(--walnut)]">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: c.active ? '#2E7D3218' : '#6B728018',
                        color: c.active ? '#2E7D32' : '#6B7280',
                        border: `1px solid ${c.active ? '#2E7D3240' : '#6B728040'}`,
                      }}
                    >
                      {c.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() =>
                        setActive.mutate(
                          { id: c.id, active: !c.active },
                          { onError: (e: any) => toast.error(e.message) },
                        )
                      }
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-md border text-[var(--mahogany)]"
                      style={{ borderColor: 'var(--caramel)' }}
                    >
                      {c.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
              {coupons?.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-sm text-[var(--walnut)] py-8">No coupons yet</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
