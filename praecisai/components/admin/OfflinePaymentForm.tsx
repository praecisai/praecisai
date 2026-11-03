'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { BadgeCheck } from 'lucide-react';
import { useAdminRecordOfflinePayment } from '../../lib/api/hooks';
import { inputCls, inputStyle } from './TenantForm';

const LIST_PRICE = { MONTHLY: 5000, YEARLY: 40000 } as const;

/**
 * Mark a tenant's plan as paid when the money came outside Razorpay. The
 * tenant stops seeing "Choose your plan", gets an invoice, and nothing is
 * auto-debited: the next payment date is shown so it can be collected again.
 */
export function OfflinePaymentForm({ tenantId }: { tenantId: string }) {
  const record = useAdminRecordOfflinePayment(tenantId);
  const [plan, setPlan] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [amount, setAmount] = useState(String(LIST_PRICE.MONTHLY));
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10));

  function pickPlan(p: 'MONTHLY' | 'YEARLY') {
    setPlan(p);
    setAmount(String(LIST_PRICE[p]));
  }

  function submit() {
    const n = Number(amount);
    if (!(n > 0 && n <= LIST_PRICE[plan])) {
      toast.error(`Amount must be between ₹1 and ₹${LIST_PRICE[plan].toLocaleString('en-IN')}`);
      return;
    }
    record.mutate(
      { plan, amount: n, paid_on: paidOn },
      {
        onSuccess: () => toast.success('Plan marked as paid: invoice issued'),
        onError: (e: any) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="mt-3 pt-3 border-t space-y-2.5" style={{ borderColor: 'rgba(221,184,146,0.4)' }}>
      <p className="text-xs font-semibold text-[var(--dark-brown)]">Paid outside Razorpay?</p>
      <div className="inline-flex rounded-lg p-1 w-full" style={{ background: 'var(--sand)' }}>
        {(['MONTHLY', 'YEARLY'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => pickPlan(p)}
            className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold"
            style={plan === p ? { background: 'var(--mahogany)', color: 'var(--cream)' } : { color: 'var(--walnut)' }}
          >
            {p === 'MONTHLY' ? 'Monthly ₹5,000' : 'Yearly ₹40,000'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-[var(--walnut)]">
          Amount received (₹)
          <input type="number" min={1} max={LIST_PRICE[plan]} value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} />
        </label>
        <label className="text-[11px] text-[var(--walnut)]">
          Paid on
          <input type="date" value={paidOn} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setPaidOn(e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} />
        </label>
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={record.isPending}
        className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
        style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
      >
        <BadgeCheck size={14} /> {record.isPending ? 'Saving…' : 'Mark plan paid offline'}
      </button>
      <p className="text-[11px] text-[var(--walnut)]">
        Less than the list price is recorded as a discount on the invoice. No auto-debit is set up.
      </p>
    </div>
  );
}
