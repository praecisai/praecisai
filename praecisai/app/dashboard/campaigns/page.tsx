'use client';

import { useState } from 'react';
import { useCampaigns, useCreateCampaign, useDeleteCampaign } from '../../../lib/api/hooks';
import { TopHeader } from '../../../components/layout/Sidebar';
import { StatusBadge } from '../../../components/shared/SegmentBadge';
import { formatDate } from '../../../lib/utils/format';
import { Plus, X, Megaphone, Trash2 } from 'lucide-react';

const TYPES = ['WHATSAPP', 'CALL', 'EMAIL', 'SMS'];

export default function CampaignsPage() {
  const { data, isLoading } = useCampaigns();
  const createMutation = useCreateCampaign();
  const deleteMutation = useDeleteCampaign();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'WHATSAPP', scheduled_at: '' });

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete campaign "${name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(id);
  }

  const campaigns = data?.data ?? [];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createMutation.mutateAsync(form);
    setShowCreate(false);
    setForm({ name: '', type: 'WHATSAPP', scheduled_at: '' });
  }

  const typeIcons: Record<string, string> = { WHATSAPP: '💬', CALL: '📞', EMAIL: '📧', SMS: '📱' };

  return (
    <div>
      <TopHeader title="Campaigns" subtitle="Manage outreach campaigns" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Create button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg, var(--walnut), var(--mahogany))' }}>
            <Plus size={15} /> New Campaign
          </button>
        </div>

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="glass-card p-5 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-white">New Campaign</h3>
                <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Campaign Name</label>
                  <input required className="input-dark" placeholder="e.g. June Follow-up Blast"
                    value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Type</label>
                  <select className="input-dark" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                    {TYPES.map((t) => <option key={t} value={t}>{typeIcons[t]} {t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Scheduled At (optional)</label>
                  <input type="datetime-local" className="input-dark"
                    value={form.scheduled_at} onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))} />
                </div>
                <button type="submit" disabled={createMutation.isPending}
                  className="w-full py-2.5 rounded-xl font-semibold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, var(--walnut), var(--mahogany))' }}>
                  {createMutation.isPending ? 'Creating…' : 'Create Campaign'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Campaign grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card p-5 space-y-3">
                <div className="skeleton h-5 w-32" />
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-3 w-24" />
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Megaphone size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">No campaigns yet</p>
            <p className="text-sm text-slate-400">Create your first campaign to start reaching out to customers</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((c: any) => (
              <div key={c.id} className="glass-card p-5 metric-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-2xl">{typeIcons[c.type] ?? '📢'}</div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={c.status} />
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      disabled={deleteMutation.isPending}
                      title="Delete campaign"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-white mb-1">{c.name}</h3>
                <p className="text-xs text-slate-500 mb-3">{c.type}</p>
                {c.scheduled_at && (
                  <p className="text-xs text-slate-400">
                    Scheduled: {formatDate(c.scheduled_at)}
                  </p>
                )}
                <p className="text-xs text-slate-600 mt-2">Created {formatDate(c.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
