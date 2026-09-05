'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  useAdminDemoAgents,
  useAdminDemoAgentStyles,
  useAdminCreateDemoAgent,
  useAdminUpdateDemoAgent,
  useAdminDeleteDemoAgent,
} from '../../../lib/api/hooks';
import { Plus, Bot, Star, Pencil, Trash2, X } from 'lucide-react';
import { Select } from '../../../components/ui/Select';

type FormState = {
  name: string;
  bolnaAgentId: string;
  scriptStyle: string;
  voiceLabel: string;
  description: string;
  sortOrder: number;
  isDefault: boolean;
  active: boolean;
};

const EMPTY: FormState = {
  name: '',
  bolnaAgentId: '',
  scriptStyle: 'formal',
  voiceLabel: '',
  description: '',
  sortOrder: 0,
  isDefault: false,
  active: true,
};

export default function AdminDemoAgentsPage() {
  const { data: agents, isLoading } = useAdminDemoAgents();
  const { data: styles } = useAdminDemoAgentStyles();
  const create = useAdminCreateDemoAgent();
  const update = useAdminUpdateDemoAgent();
  const del = useAdminDeleteDemoAgent();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const styleOptions = (styles ?? [{ slug: 'formal', label: 'Formal (original)' }]).map((s) => ({
    value: s.slug,
    label: s.label,
  }));

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function resetForm() {
    setForm(EMPTY);
    setEditingId(null);
  }

  function startEdit(a: any) {
    setEditingId(a.id);
    setForm({
      name: a.name,
      bolnaAgentId: a.bolna_agent_id,
      scriptStyle: a.script_style,
      voiceLabel: a.voice_label ?? '',
      description: a.description ?? '',
      sortOrder: a.sort_order ?? 0,
      isDefault: a.is_default,
      active: a.active,
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      bolnaAgentId: form.bolnaAgentId.trim(),
      scriptStyle: form.scriptStyle,
      voiceLabel: form.voiceLabel.trim(),
      description: form.description.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      isDefault: form.isDefault,
      active: form.active,
    };
    const opts = {
      onSuccess: () => {
        toast.success(editingId ? 'Agent updated' : 'Agent created');
        resetForm();
      },
      onError: (err: any) => toast.error(err.message),
    };
    if (editingId) update.mutate({ id: editingId, ...payload }, opts);
    else create.mutate(payload, opts);
  }

  const saving = create.isPending || update.isPending;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-[var(--dark-brown)]">Demo Agents</h1>
        <p className="text-xs text-[var(--walnut)] max-w-2xl">
          Voice agents the prospect can pick on the demo dashboard. Each maps a Bolna agent (its own
          voice on the platform account) to a script tone. Mark exactly one as default : it is
          auto-selected on the dashboard.
        </p>
      </div>

      {/* Create / edit */}
      <form onSubmit={submit} className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--dark-brown)]">
            {editingId ? 'Edit agent' : 'Add agent'}
          </p>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-1 text-[11px] font-medium text-[var(--walnut)] hover:text-[var(--mahogany)]"
            >
              <X size={12} /> Cancel edit
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--walnut)] uppercase mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Meena : Warm"
              required
              className="px-3 py-2 rounded-lg text-sm border bg-[var(--surface-warm)] text-[var(--dark-brown)] w-48"
              style={{ borderColor: 'var(--caramel)' }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--walnut)] uppercase mb-1">Bolna agent ID</label>
            <input
              value={form.bolnaAgentId}
              onChange={(e) => set('bolnaAgentId', e.target.value)}
              placeholder="xxxxxxxx-xxxx-..."
              required
              className="px-3 py-2 rounded-lg text-sm border bg-[var(--surface-warm)] text-[var(--dark-brown)] w-72 font-mono"
              style={{ borderColor: 'var(--caramel)' }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--walnut)] uppercase mb-1">Script tone</label>
            <Select
              value={form.scriptStyle}
              onChange={(v) => set('scriptStyle', v)}
              className="w-44"
              options={styleOptions}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--walnut)] uppercase mb-1">Voice label</label>
            <input
              value={form.voiceLabel}
              onChange={(e) => set('voiceLabel', e.target.value)}
              placeholder="Female · Warm"
              className="px-3 py-2 rounded-lg text-sm border bg-[var(--surface-warm)] text-[var(--dark-brown)] w-40"
              style={{ borderColor: 'var(--caramel)' }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--walnut)] uppercase mb-1">Order</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => set('sortOrder', Number(e.target.value))}
              className="px-3 py-2 rounded-lg text-sm border bg-[var(--surface-warm)] text-[var(--dark-brown)] w-20"
              style={{ borderColor: 'var(--caramel)' }}
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[var(--walnut)] uppercase mb-1">Description (shown to prospect)</label>
          <input
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Friendly, conversational tone"
            className="px-3 py-2 rounded-lg text-sm border bg-[var(--surface-warm)] text-[var(--dark-brown)] w-full max-w-xl"
            style={{ borderColor: 'var(--caramel)' }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <label className="flex items-center gap-2 text-sm text-[var(--dark-brown)]">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => set('isDefault', e.target.checked)} />
            Default on dashboard
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--dark-brown)]">
            <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
            Active
          </label>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
            style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
          >
            <Plus size={14} /> {editingId ? 'Save changes' : 'Create'}
          </button>
        </div>
      </form>

      {/* List */}
      <div className="glass-card overflow-x-auto">
        {isLoading ? (
          <p className="text-sm text-[var(--walnut)] p-6 text-center">Loading agents…</p>
        ) : (
          <table className="data-table w-full min-w-[760px]">
            <thead>
              <tr>
                <th className="text-left">Name</th>
                <th className="text-left">Bolna agent ID</th>
                <th className="text-left">Tone</th>
                <th className="text-left">Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(agents ?? []).map((a: any) => (
                <tr key={a.id}>
                  <td className="text-sm font-semibold text-[var(--dark-brown)]">
                    <span className="inline-flex items-center gap-1.5">
                      <Bot size={14} className="text-[var(--mahogany)]" /> {a.name}
                      {a.is_default && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: '#B8860B18', color: '#B8860B', border: '1px solid #B8860B40' }}>
                          <Star size={9} /> DEFAULT
                        </span>
                      )}
                    </span>
                    {a.voice_label && <div className="text-[11px] text-[var(--walnut)] mt-0.5">{a.voice_label}</div>}
                  </td>
                  <td className="text-xs font-mono text-[var(--walnut)]">{a.bolna_agent_id}</td>
                  <td className="text-sm text-[var(--dark-brown)]">
                    {(styles ?? []).find((s) => s.slug === a.script_style)?.label ?? a.script_style}
                  </td>
                  <td>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: a.active ? '#2E7D3218' : '#6B728018',
                        color: a.active ? '#2E7D32' : '#6B7280',
                        border: `1px solid ${a.active ? '#2E7D3240' : '#6B728040'}`,
                      }}
                    >
                      {a.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => startEdit(a)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border text-[var(--mahogany)]"
                        style={{ borderColor: 'var(--caramel)' }}
                      >
                        <Pencil size={11} /> Edit
                      </button>
                      {!a.is_default && (
                        <button
                          onClick={() =>
                            update.mutate(
                              { id: a.id, isDefault: true },
                              { onError: (e: any) => toast.error(e.message) },
                            )
                          }
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-md border text-[var(--walnut)]"
                          style={{ borderColor: 'var(--caramel)' }}
                        >
                          Make default
                        </button>
                      )}
                      <button
                        onClick={() =>
                          update.mutate(
                            { id: a.id, active: !a.active },
                            { onError: (e: any) => toast.error(e.message) },
                          )
                        }
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-md border text-[var(--walnut)]"
                        style={{ borderColor: 'var(--caramel)' }}
                      >
                        {a.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => {
                          if (!confirm(`Delete agent "${a.name}"? This cannot be undone.`)) return;
                          del.mutate(a.id, {
                            onSuccess: () => toast.success('Agent deleted'),
                            onError: (e: any) => toast.error(e.message),
                          });
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border"
                        style={{ borderColor: '#C6282840', color: '#C62828' }}
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {agents?.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-sm text-[var(--walnut)] py-8">
                    No demo agents yet. Add one above : until then, demo calls use the default env agent.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
