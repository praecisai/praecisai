'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  useAdminTenant,
  useAdminUpdateTenant,
  useAdminToggleTestCall,
  useAdminLinkUsers,
  useAdminPollBolna,
  useAdminDeleteTenant,
} from '../../../../lib/api/hooks';
import { TenantForm, TenantFormValues } from '../../../../components/admin/TenantForm';
import { CheckCircle2, Circle, RefreshCcw, Users, Link2, Trash2, AlertTriangle } from 'lucide-react';

/** Plan-aware label for the payment row so trial vs full onboarding is clear. */
function paymentLabel(checklist: any): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN');
  if (checklist.plan_paid === 'ONBOARDING') return 'Onboarding payment done · Full plan';
  if (checklist.plan_paid === 'TRIAL') {
    if (checklist.trial_active && checklist.trial_ends_at) {
      return `Paid · 10-day trial (till ${fmt(checklist.trial_ends_at)})`;
    }
    if (checklist.trial_ends_at) return `Trial paid · expired ${fmt(checklist.trial_ends_at)}`;
    return 'Paid · 10-day trial';
  }
  return 'Onboarding payment pending';
}

function ChecklistItem({
  done,
  label,
  action,
}: {
  done: boolean;
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2.5">
        {done ? (
          <CheckCircle2 size={17} style={{ color: '#2E7D32' }} />
        ) : (
          <Circle size={17} className="text-[var(--walnut)]" />
        )}
        <span className={`text-sm ${done ? 'text-[var(--dark-brown)]' : 'text-[var(--walnut)]'}`}>{label}</span>
      </div>
      {action}
    </div>
  );
}

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: tenant, isLoading } = useAdminTenant(id);
  const update = useAdminUpdateTenant(id);
  const toggleTest = useAdminToggleTestCall(id);
  const linkUsers = useAdminLinkUsers(id);
  const pollBolna = useAdminPollBolna(id);
  const deleteTenant = useAdminDeleteTenant();
  const [deleteInput, setDeleteInput] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  if (isLoading || !tenant) {
    return <p className="text-sm text-[var(--walnut)]">Loading tenant…</p>;
  }

  function submit(values: TenantFormValues) {
    update.mutate(values, {
      onSuccess: () => toast.success('Tenant updated'),
      onError: (err: any) => toast.error(err.message),
    });
  }

  const checklist = tenant.checklist ?? {};

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--dark-brown)]">{tenant.name}</h1>
          <p className="text-xs text-[var(--walnut)]">
            Onboarding: {tenant.onboarding_status} · Created {new Date(tenant.created_at).toLocaleDateString('en-IN')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              pollBolna.mutate(undefined, {
                onSuccess: () => toast.success('Bolna balance refreshed'),
                onError: (e: any) => toast.error(e.message),
              })
            }
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border text-[var(--mahogany)]"
            style={{ borderColor: 'var(--caramel)' }}
          >
            <RefreshCcw size={13} className={pollBolna.isPending ? 'animate-spin' : ''} /> Poll Bolna now
          </button>
          <button
            onClick={() =>
              linkUsers.mutate(undefined, {
                onSuccess: (res: any) =>
                  toast.success(`${res.data?.data?.linked ?? 0} user(s) linked to this tenant`),
                onError: (e: any) => toast.error(e.message),
              })
            }
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border text-[var(--mahogany)]"
            style={{ borderColor: 'var(--caramel)' }}
          >
            <Link2 size={13} /> Link signed-up users
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Edit form */}
        <div className="glass-card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-[var(--dark-brown)] mb-4">Tenant settings</h2>
          <TenantForm
            initial={{
              name: tenant.name,
              allowedEmails: (tenant.allowed_emails ?? []).map((a: any) => a.email),
              lowBalanceThresholdUsd: tenant.low_balance_threshold_usd,
              billingEmail: tenant.billing_email ?? '',
              gstin: tenant.gstin ?? '',
            }}
            previews={tenant.keys}
            saving={update.isPending}
            submitLabel="Save changes"
            onSubmit={submit}
          />
        </div>

        <div className="space-y-4">
          {/* Onboarding checklist */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-[var(--dark-brown)] mb-2">Onboarding checklist</h2>
            <ChecklistItem done={checklist.bolna_connected} label="Bolna connected" />
            <ChecklistItem done={checklist.aisensy_connected} label="AiSensy connected" />
            <ChecklistItem
              done={checklist.onboarding_paid || checklist.trial_paid || checklist.trial_active}
              label={paymentLabel(checklist)}
              action={
                checklist.plan_paid === 'TRIAL' ? (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: '#B8860B18', color: '#B8860B', border: '1px solid #B8860B40' }}
                  >
                    Trial
                  </span>
                ) : checklist.plan_paid === 'ONBOARDING' ? (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: '#2E7D3218', color: '#2E7D32', border: '1px solid #2E7D3240' }}
                  >
                    Full plan
                  </span>
                ) : null
              }
            />
            <ChecklistItem
              done={checklist.test_call_passed}
              label="Test call passed"
              action={
                <button
                  onClick={() =>
                    toggleTest.mutate(!checklist.test_call_passed, {
                      onError: (e: any) => toast.error(e.message),
                    })
                  }
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-md border text-[var(--mahogany)]"
                  style={{ borderColor: 'var(--caramel)' }}
                >
                  {checklist.test_call_passed ? 'Mark not done' : 'Mark done'}
                </button>
              }
            />
          </div>

          {/* Users */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-[var(--dark-brown)] mb-2 flex items-center gap-2">
              <Users size={15} /> Users on this tenant
            </h2>
            {tenant.users?.length ? (
              <ul className="space-y-1.5">
                {tenant.users.map((u: any) => (
                  <li key={u.email} className="text-xs text-[var(--dark-brown)] flex justify-between gap-2">
                    <span className="truncate">{u.email}</span>
                    <span className="text-[var(--walnut)]">{u.role}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[var(--walnut)]">
                No users yet: they appear after first login, then use "Link signed-up users"
              </p>
            )}
          </div>

          {/* Subscription */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-[var(--dark-brown)] mb-2">Subscription</h2>
            {tenant.billing_subscriptions?.length ? (
              tenant.billing_subscriptions.map((s: any) => (
                <div key={s.id} className="text-xs text-[var(--walnut)] space-y-1">
                  <p>Status: <span className="font-semibold text-[var(--dark-brown)]">{s.status}</span></p>
                  <p>Next debit: {s.next_debit_date ? new Date(s.next_debit_date).toLocaleDateString('en-IN') : '-'}</p>
                  <p>Mandate: {s.mandate_type ?? '-'}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--walnut)]">No subscription yet</p>
            )}
          </div>

          {/* Danger zone */}
          <div className="glass-card p-5" style={{ border: '1px solid #C6282840' }}>
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: '#C62828' }}>
              <AlertTriangle size={15} /> Danger zone
            </h2>
            {!showDelete ? (
              <button
                onClick={() => setShowDelete(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border"
                style={{ borderColor: '#C6282860', color: '#C62828' }}
              >
                <Trash2 size={13} /> Delete this business
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-[var(--walnut)]">
                  This permanently deletes <b>{tenant.name}</b> with ALL its customers, invoices,
                  call logs and billing history. Type the business name to confirm:
                </p>
                <input
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder={tenant.name}
                  className="w-full px-3 py-2 rounded-lg text-sm border bg-[var(--surface-warm)] text-[var(--dark-brown)]"
                  style={{ borderColor: '#C6282860' }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      deleteTenant.mutate(
                        { id, confirmName: deleteInput },
                        {
                          onSuccess: () => {
                            toast.success(`${tenant.name} deleted`);
                            router.push('/admin/tenants');
                          },
                          onError: (e: any) => toast.error(e.message),
                        },
                      )
                    }
                    disabled={deleteInput !== tenant.name || deleteTenant.isPending}
                    className="px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
                    style={{ background: '#C62828', color: '#fff' }}
                  >
                    {deleteTenant.isPending ? 'Deleting…' : 'Delete forever'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDelete(false);
                      setDeleteInput('');
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-semibold border text-[var(--walnut)]"
                    style={{ borderColor: 'var(--caramel)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
