'use client';

import { useState, useRef } from 'react';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import { TopHeader } from '@/components/layout/Sidebar';
import {
  Upload, FileSpreadsheet, CheckCircle2, Clock, XCircle, TrendingDown, AlertCircle,
  Plus, X, ChevronDown, Search, Phone, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

type PdcStatus = 'PENDING' | 'CLEARED' | 'BOUNCED';

// Tinted pills rather than flat Tailwind palette colours: the dashboard has a
// dark theme, where `bg-amber-50` + `text-amber-600` collapses into an
// unreadable smudge. Each status keeps its hue but re-tunes for the theme.
const STATUS_CONFIG: Record<PdcStatus, { label: string; color: string; icon: any }> = {
  PENDING: {
    label: 'Pending',
    color: 'text-amber-700 bg-amber-100/70 border-amber-300 dark:text-amber-300 dark:bg-amber-400/10 dark:border-amber-400/35',
    icon: Clock,
  },
  CLEARED: {
    label: 'Cleared',
    color: 'text-green-700 bg-green-100/70 border-green-300 dark:text-green-300 dark:bg-green-400/10 dark:border-green-400/35',
    icon: CheckCircle2,
  },
  BOUNCED: {
    label: 'Bounced',
    color: 'text-red-700 bg-red-100/70 border-red-300 dark:text-red-300 dark:bg-red-400/10 dark:border-red-400/35',
    icon: XCircle,
  },
};

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CLEARED', label: 'Cleared' },
  { value: 'BOUNCED', label: 'Bounced' },
];

function StatusBadge({ status }: { status: PdcStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', cfg.color)}>
      <Icon size={11} stroke={2} /> {cfg.label}
    </span>
  );
}

export default function PdcPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['pdc', 'stats'],
    queryFn: async () => (await api.get('/pdc/stats')).data.data,
  });

  const { data: cheques, isLoading } = useQuery({
    queryKey: ['pdc', 'cheques', statusFilter, debouncedSearch],
    queryFn: async () => (await api.get('/pdc/cheques', {
      params: { status: statusFilter === 'ALL' ? undefined : statusFilter, search: debouncedSearch || undefined },
    })).data.data,
  });

  const { data: uploads } = useQuery({
    queryKey: ['pdc', 'uploads'],
    queryFn: async () => (await api.get('/pdc/uploads')).data.data,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/pdc/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pdc'] }); },
  });

  // Manual single-cheque entry: appended alongside uploaded data.
  const emptyForm = { party_name: '', cheque_no: '', cheque_date: '', amount: '' };
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const addCheque = useMutation({
    mutationFn: (payload: any) => api.post('/pdc/cheques', payload),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['pdc'] });
      closeAddModal();
      toast.success(res?.data?.data?.matched ? 'Cheque added and matched to a customer' : 'Cheque added');
    },
    onError: (e: any) => toast.error('Could not add cheque', { description: e?.message }),
  });
  const formValid =
    form.party_name.trim().length > 1 &&
    form.cheque_no.trim().length > 0 &&
    Number(form.amount) > 0;

  // Party-name combobox against existing customers (server-side search). It
  // opens on focus with the first parties already listed, so the field works as
  // a dropdown for someone who does not know the exact spelling and as a
  // type-ahead for someone who does.
  const [partyOpen, setPartyOpen] = useState(false);
  const [partyIdx, setPartyIdx] = useState(0);
  // The customer actually picked from the list, kept so the modal can show its
  // phone: a party with no phone gets no cheque reminder, and it is far cheaper
  // to say so here than to wonder later why the WhatsApp never went out.
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const partyInputRef = useRef<HTMLInputElement>(null);
  const debouncedParty = useDebounce(form.party_name, 200);
  const { data: partyMatches, isFetching: partySearching } = useQuery({
    queryKey: ['pdc', 'party-search', debouncedParty.trim()],
    queryFn: async () =>
      (await api.get('/customers', {
        params: { search: debouncedParty.trim() || undefined, limit: 8 },
      })).data.data,
    enabled: showAdd,
  });
  const partyList: any[] = partyMatches?.data ?? [];
  const typedParty = form.party_name.trim();
  const exactMatch = partyList.some(
    (c) => c.customer_name?.trim().toLowerCase() === typedParty.toLowerCase(),
  );

  function pickParty(c: any) {
    setForm((f) => ({ ...f, party_name: c.customer_name }));
    setSelectedParty(c);
    setPartyOpen(false);
  }

  function closeAddModal() {
    setShowAdd(false);
    setForm(emptyForm);
    setSelectedParty(null);
    setPartyOpen(false);
  }

  function onPartyKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!partyOpen) { setPartyOpen(true); return; }
      if (partyList.length === 0) return;
      const next = e.key === 'ArrowDown' ? partyIdx + 1 : partyIdx - 1;
      setPartyIdx((next + partyList.length) % partyList.length);
    } else if (e.key === 'Enter' && partyOpen && partyList[partyIdx]) {
      // Enter picks the highlighted party instead of submitting a half-filled form
      e.preventDefault();
      pickParty(partyList[partyIdx]);
    } else if (e.key === 'Escape' && partyOpen) {
      e.preventDefault();
      setPartyOpen(false);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError('');
    setUploadResult(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await api.post('/pdc/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadResult(res.data.data);
      qc.invalidateQueries({ queryKey: ['pdc'] });
    } catch (e: any) {
      // The API client rejects with a plain Error carrying the server's
      // message, so `e.response` never exists here: read `e.message`.
      setUploadError(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const statCards = [
    { label: 'Total Cheques', value: String(stats?.total ?? 0), icon: FileSpreadsheet, color: 'text-[var(--mahogany)]' },
    { label: 'Pending',       value: String(stats?.pending ?? 0), icon: Clock,          color: 'text-amber-600 dark:text-amber-300' },
    { label: 'Cleared',       value: String(stats?.cleared ?? 0), icon: CheckCircle2,   color: 'text-green-700 dark:text-green-300' },
    { label: 'Bounced',       value: String(stats?.bounced ?? 0), icon: XCircle,        color: 'text-red-600 dark:text-red-300' },
    { label: 'In Cooldown',   value: String(stats?.in_cooldown ?? 0), icon: AlertCircle, color: 'text-purple-600 dark:text-purple-300' },
    { label: 'Total Cleared ₹', value: `₹${((stats?.cleared_amount ?? 0)/100000).toFixed(1)}L`, icon: TrendingDown, color: 'text-[var(--recovery-green)]' },
  ];

  return (
    <div className="flex flex-col" style={{ background: 'var(--cream)', minHeight: '100%' }}>
      <TopHeader title="PDC Cheques" subtitle="Post-dated cheque tracking and calling cooldown management" />

      <div className="p-4 sm:p-6 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                  <Icon size={14} className={cn(s.color, 'w-3 h-3 sm:w-3.5 sm:h-3.5')} strokeWidth={1.75} />
                  <span className="font-body text-[10px] sm:text-[11px] text-[var(--walnut)]">{s.label}</span>
                </div>
                <p className={cn('font-display text-lg sm:text-xl font-bold', s.color)}>{s.value}</p>
              </div>
            );
          })}
        </div>

        {/* Info box */}
        <div className="rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-4">
          <h3 className="font-display text-[13px] font-semibold text-[var(--mahogany)] mb-2">How PDC tracking works</h3>
          <ul className="space-y-1 font-body text-[12px] text-[var(--walnut)] list-none">
            <li>📤 Upload your PDC Excel: fields auto-detected (Party Name, Cheque No, Date, Amount in any order)</li>
            <li>🔗 System matches party names to your outstanding list via fuzzy matching</li>
            <li>✅ When you upload a new outstanding and a party's due amount decreases → cheque auto-cleared</li>
            <li>⏸ Cleared party enters <strong>15-day calling cooldown</strong>: agent won't call during this period</li>
            <li>📅 Multiple cheques: cooldown starts from the <strong>latest cleared cheque date</strong></li>
            <li>📲 <strong>Two days before</strong> a pending cheque&apos;s date the party gets a WhatsApp reminder to keep the account funded: switch it on or off under Settings · Schedule</li>
          </ul>
        </div>

        {/* Upload section */}
        <div className="rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-[15px] font-semibold text-[var(--dark-brown)]">Upload PDC Excel</h3>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--caramel)] px-3 py-1.5 text-[12px] font-medium text-[var(--mahogany)] hover:border-[var(--mahogany)] transition-colors"
            >
              <Plus size={14} strokeWidth={2} /> Add cheque manually
            </button>
          </div>

          <div
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--caramel)] bg-[var(--sand)]/40 px-4 sm:px-6 py-8 sm:py-10 text-center cursor-pointer hover:border-[var(--mahogany)] transition-colors"
            onClick={() => fileRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
            onDragOver={(e) => e.preventDefault()}
          >
            <Upload size={28} className="text-[var(--mahogany)]" strokeWidth={1.5} />
            <p className="font-body text-sm font-medium text-[var(--dark-brown)]">
              {uploading ? 'Uploading…' : 'Drop your PDC Excel here or click to browse'}
            </p>
            <p className="font-body text-[11px] text-[var(--walnut)]">
              Columns auto-detected: Party Name, Cheque No, Date, Amount (any order)
            </p>
            <input
              ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
            />
          </div>

          {uploadError && (
            <div className="mt-3 rounded-lg border p-3 text-sm bg-red-100/70 border-red-300 text-red-700 dark:bg-red-400/10 dark:border-red-400/35 dark:text-red-300">{uploadError}</div>
          )}

          {uploadResult && (
            <div className="mt-3 rounded-lg border p-4 text-sm bg-green-100/70 border-green-300 text-green-800 dark:bg-green-400/10 dark:border-green-400/35 dark:text-green-300">
              <p className="font-semibold mb-1">✅ Upload successful</p>
              <p>New cheques: <strong>{uploadResult.records_total}</strong> · Matched to customers: <strong>{uploadResult.records_matched}</strong> · Unmatched: <strong>{uploadResult.records_unmatched}</strong></p>
              {uploadResult.records_duplicate > 0 && (
                <p className="mt-1">
                  <strong>{uploadResult.records_duplicate}</strong> cheque(s) were already on record and were skipped, so nothing got counted twice.
                </p>
              )}
              {uploadResult.columns_detected && (
                <p className="mt-1 text-[11px] opacity-70">
                  Detected: {Object.entries(uploadResult.columns_detected).map(([f, c]) => `${f} → "${c}"`).join(' · ')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Cheques table */}
        <div className="rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] overflow-hidden">
          {/* Filters */}
          <div className="flex flex-col gap-3 border-b border-[var(--caramel)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              {STATUS_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={cn(
                    'rounded-full px-3 py-1 font-body text-[11px] sm:text-[12px] font-medium transition-colors border',
                    // text-cream, not text-white: on the dark theme --mahogany is
                    // a light tan, so white text on it is unreadable.
                    statusFilter === value
                      ? 'bg-[var(--mahogany)] text-[var(--cream)] border-[var(--mahogany)]'
                      : 'bg-[var(--sand)] border-[var(--caramel)] text-[var(--dark-brown)] hover:border-[var(--mahogany)] hover:text-[var(--mahogany)]'
                  )}
                >{label}</button>
              ))}
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search party name…"
              className="rounded-lg border border-[var(--caramel)] bg-[var(--cream)] px-3 py-1.5 font-body text-[13px] text-[var(--dark-brown)] outline-none focus:border-[var(--mahogany)] w-full sm:w-56"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] font-body text-[12px] sm:text-sm text-left">
              <thead className="bg-[var(--sand)] text-[12px] font-semibold text-[var(--dark-brown)] border-b border-[var(--caramel)]">
                <tr>
                  {['Party Name', 'Cheque No.', 'Date', 'Amount (₹)', 'Status', 'Cleared On', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-2.5 sm:px-4 sm:py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--caramel)] text-[var(--dark-brown)]">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--walnut)]">Loading…</td></tr>
                ) : !cheques?.data?.length ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--walnut)]">No cheques found</td></tr>
                ) : cheques.data.map((c: any) => (
                  <tr key={c.id} className="hover:bg-[var(--cream)] transition-colors">
                    <td className="px-3 py-2 sm:px-4 sm:py-2.5 font-medium">{c.party_name}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-2.5 text-[var(--walnut)]">{c.cheque_no}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-2.5 text-[var(--walnut)]">
                      {c.cheque_date ? new Date(c.cheque_date).toLocaleDateString('en-IN') : '-'}
                      {c.reminder_sent_at && (
                        <span className="block text-[10px] text-[var(--recovery-green)]">
                          reminder sent {new Date(c.reminder_sent_at).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-2.5 font-medium">₹{Number(c.amount).toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-2.5"><StatusBadge status={c.status} /></td>
                    <td className="px-3 py-2 sm:px-4 sm:py-2.5 text-[var(--walnut)]">
                      {c.cleared_date ? new Date(c.cleared_date).toLocaleDateString('en-IN') : '-'}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-2.5">
                      <div className="flex gap-1">
                        {c.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => updateStatus.mutate({ id: c.id, status: 'CLEARED' })}
                              className="rounded px-2 py-1 text-[11px] font-medium border transition-colors text-green-700 border-green-300 hover:bg-green-100 dark:text-green-300 dark:border-green-400/35 dark:hover:bg-green-400/10"
                            >Mark Cleared</button>
                            <button
                              onClick={() => updateStatus.mutate({ id: c.id, status: 'BOUNCED' })}
                              className="rounded px-2 py-1 text-[11px] font-medium border transition-colors text-red-600 border-red-300 hover:bg-red-100 dark:text-red-300 dark:border-red-400/35 dark:hover:bg-red-400/10"
                            >Mark Bounced</button>
                          </>
                        )}
                        {c.status !== 'PENDING' && (
                          <button
                            onClick={() => updateStatus.mutate({ id: c.id, status: 'PENDING' })}
                            className="rounded px-2 py-1 text-[11px] font-medium text-[var(--walnut)] hover:bg-[var(--sand)] border border-[var(--caramel)] transition-colors"
                          >Reset</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent uploads */}
        {uploads?.length > 0 && (
          <div className="rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-4">
            <h3 className="font-display text-[13px] font-semibold text-[var(--dark-brown)] mb-3">Recent Uploads</h3>
            <div className="space-y-2">
              {uploads.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--sand)] px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-body text-[13px] font-medium text-[var(--dark-brown)] truncate">{u.file_name}</p>
                    <p className="font-body text-[11px] text-[var(--walnut)]">
                      {u.records_total} rows · {u.records_matched} matched · {u.records_cleared} cleared
                    </p>
                  </div>
                  <p className="font-body text-[11px] text-[var(--walnut)] flex-shrink-0 whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Manual entry modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(30,20,12,0.5)' }}
          onClick={() => !addCheque.isPending && closeAddModal()}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-[16px] font-semibold text-[var(--dark-brown)]">Add cheque manually</h3>
              <button onClick={closeAddModal} className="text-[var(--walnut)] hover:text-[var(--mahogany)]">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="relative">
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--walnut)] mb-1.5">Party Name</label>
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--walnut)]" strokeWidth={1.75} />
                  <input
                    ref={partyInputRef}
                    value={form.party_name}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, party_name: e.target.value }));
                      setSelectedParty(null);
                      setPartyIdx(0);
                      setPartyOpen(true);
                    }}
                    onFocus={() => setPartyOpen(true)}
                    onBlur={() => setTimeout(() => setPartyOpen(false), 120)}
                    onKeyDown={onPartyKeyDown}
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={partyOpen}
                    aria-controls="pdc-party-list"
                    aria-autocomplete="list"
                    placeholder="Search a party, or type a new name"
                    className="w-full rounded-lg border border-[var(--caramel)] bg-[var(--cream)] pl-9 pr-9 py-2 text-[13px] text-[var(--dark-brown)] outline-none focus:border-[var(--mahogany)]"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => {
                      // Mouse-down, not click: the input's blur would close the
                      // list before a click ever landed.
                      e.preventDefault();
                      setPartyOpen((o) => !o);
                      partyInputRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--walnut)] hover:text-[var(--mahogany)]"
                    aria-label={partyOpen ? 'Hide party list' : 'Show party list'}
                  >
                    {partySearching
                      ? <Loader2 size={14} className="animate-spin" />
                      : <ChevronDown size={14} className={cn('transition-transform', partyOpen && 'rotate-180')} />}
                  </button>
                </div>

                {partyOpen && (
                  <div
                    id="pdc-party-list"
                    role="listbox"
                    className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-[var(--caramel)] bg-[var(--surface-warm)] shadow-lg"
                  >
                    {partyList.map((c, i) => (
                      <button
                        key={c.id}
                        type="button"
                        role="option"
                        aria-selected={i === partyIdx}
                        onMouseDown={(e) => { e.preventDefault(); pickParty(c); }}
                        onMouseEnter={() => setPartyIdx(i)}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] text-[var(--dark-brown)] transition-colors',
                          i === partyIdx && 'bg-[var(--sand)]',
                        )}
                      >
                        <span className="truncate">{c.customer_name}</span>
                        <span className="flex flex-shrink-0 items-center gap-2 text-[11px] text-[var(--walnut)]">
                          {c.city && <span>{c.city}</span>}
                          {c.phone
                            ? <span className="inline-flex items-center gap-1"><Phone size={10} strokeWidth={2} />{c.phone}</span>
                            : <span className="text-amber-600 dark:text-amber-300">no phone</span>}
                        </span>
                      </button>
                    ))}
                    {partyList.length === 0 && (
                      <p className="px-3 py-2.5 text-[12px] text-[var(--walnut)]">
                        {partySearching ? 'Searching…' : 'No party matches that name'}
                      </p>
                    )}
                    {typedParty.length >= 2 && !exactMatch && (
                      <p className="border-t border-[var(--caramel)] px-3 py-2 text-[11px] text-[var(--walnut)]">
                        Not in the list? &ldquo;{typedParty}&rdquo; is saved as typed and matched to a customer later.
                      </p>
                    )}
                  </div>
                )}

                {selectedParty ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--walnut)]">
                    <CheckCircle2 size={12} className="text-[var(--recovery-green)] flex-shrink-0" strokeWidth={2} />
                    {selectedParty.phone
                      ? <>Linked to {selectedParty.customer_name} · reminder goes to {selectedParty.phone}</>
                      : <>Linked to {selectedParty.customer_name} · no phone on file, so no cheque reminder can be sent</>}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[11px] text-[var(--walnut)]">Pick an existing party, or type a new name.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--walnut)] mb-1.5">Cheque No.</label>
                  <input
                    value={form.cheque_no}
                    onChange={(e) => setForm((f) => ({ ...f, cheque_no: e.target.value }))}
                    placeholder="466833"
                    className="w-full rounded-lg border border-[var(--caramel)] bg-[var(--cream)] px-3 py-2 text-[13px] text-[var(--dark-brown)] outline-none focus:border-[var(--mahogany)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--walnut)] mb-1.5">Amount (₹)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="50000"
                    className="w-full rounded-lg border border-[var(--caramel)] bg-[var(--cream)] px-3 py-2 text-[13px] text-[var(--dark-brown)] outline-none focus:border-[var(--mahogany)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--walnut)] mb-1.5">Cheque Date</label>
                <input
                  type="date"
                  value={form.cheque_date}
                  onChange={(e) => setForm((f) => ({ ...f, cheque_date: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--caramel)] bg-[var(--cream)] px-3 py-2 text-[13px] text-[var(--dark-brown)] outline-none focus:border-[var(--mahogany)]"
                />
                <p className="mt-1 text-[11px] text-[var(--walnut)]">The date the cheque is payable. Leave blank to use today.</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowAdd(false)}
                disabled={addCheque.isPending}
                className="rounded-lg border border-[var(--caramel)] px-4 py-2 text-[13px] font-medium text-[var(--walnut)] hover:bg-[var(--sand)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  addCheque.mutate({
                    party_name: form.party_name.trim(),
                    cheque_no: form.cheque_no.trim(),
                    cheque_date: form.cheque_date || undefined,
                    amount: Number(form.amount),
                  })
                }
                disabled={!formValid || addCheque.isPending}
                className="rounded-lg px-4 py-2 text-[13px] font-medium text-[var(--cream)] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--walnut), var(--mahogany))' }}
              >
                {addCheque.isPending ? 'Adding…' : 'Add cheque'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
