'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { MessageCircle, Phone, CheckCircle2, Info, Clock, AlertTriangle, Layers, CreditCard, History } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import DemoConfirmModal from './DemoConfirmModal';
import DemoFiltersBar from './DemoFiltersBar';

function MobileInput({ value, onCommit }: { value: string; onCommit: (val: string) => void }) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
      className="w-28 rounded border border-transparent px-2 py-1 focus:border-[var(--mahogany)] focus:outline-none focus:ring-1 focus:ring-[var(--mahogany)] bg-transparent hover:bg-[var(--surface-warm)] text-[12px] sm:text-[13px]"
    />
  );
}

export type DemoRowData = {
  id: string;
  partyName: string;
  city: string;
  billNo: string;
  billDate: string;
  agentName: string;
  dueAmount: number;
  daysOutstanding: number;
  mobileNo: string;
  voiceSent: boolean;
  whatsappSent: boolean;
  // Case flags
  isPaidGracePeriod?: boolean;    // Case 3: paid, 15-day cooldown
  graceDaysLeft?: number;
  originalAmount?: number;        // Case 5: partial payment — original bill total
  isMultiInvoice?: boolean;       // Case 1: part of a multi-invoice party group
  hasCallHistory?: boolean;       // Case 2: previous calls exist for this party
  // Past call history rows (read-only, no action buttons)
  isPastCall?: boolean;
  pastCallSegment?: string;
  pastCallDate?: string;
  pastCallOutcome?: string;
};

// ─── Demo dataset — showcases all 5 intelligence cases ───────────────────────
const initialData: DemoRowData[] = [
  // Below 90 — no segment, buttons disabled
  {
    id: '1',
    partyName: 'RAMESHWAR TEXTILES',
    city: 'MUMBAI',
    billNo: 'INV-101',
    billDate: '25/03/2026',
    agentName: 'DIRECT',
    dueAmount: 45000,
    daysOutstanding: 62,
    mobileNo: '',
    voiceSent: false,
    whatsappSent: false,
  },
  // Soft Reminder — 90-120 days
  {
    id: '1b',
    partyName: 'PATEL ENTERPRISES',
    city: 'SURAT',
    billNo: 'INV-155',
    billDate: '05/03/2026',
    agentName: 'DIRECT',
    dueAmount: 32000,
    daysOutstanding: 98,
    mobileNo: '',
    voiceSent: false,
    whatsappSent: false,
  },
  // Case 1: Multi-invoice — GUPTA TRADERS has 2 SEPARATE bills, older first
  {
    id: '2',
    partyName: 'GUPTA TRADERS',
    city: 'DELHI',
    billNo: 'INV-301',        // older bill — Jan
    billDate: '15/01/2026',
    agentName: 'DIRECT',
    dueAmount: 120500,
    daysOutstanding: 138,   // 121-150 → Follow-up
    mobileNo: '',
    voiceSent: false,
    whatsappSent: false,
    isMultiInvoice: true,
  },
  {
    id: '3',
    partyName: 'GUPTA TRADERS',
    city: 'DELHI',
    billNo: 'INV-302',        // newer bill — Mar
    billDate: '10/03/2026',
    agentName: 'DIRECT',
    dueAmount: 85000,
    daysOutstanding: 125,   // 121-150 → Follow-up
    mobileNo: '',
    voiceSent: false,
    whatsappSent: false,
    isMultiInvoice: true,
  },
  // Case 5: Partial payment — SHARMA DISTRIBUTORS, same bill INV-204 appears twice
  // Original ₹1,20,500 → paid ₹50,000 → remaining ₹70,500
  {
    id: '4',
    partyName: 'SHARMA DISTRIBUTORS',
    city: 'MUMBAI',
    billNo: 'INV-204',
    billDate: '05/01/2026',
    agentName: 'DIRECT',
    dueAmount: 120500,
    daysOutstanding: 170,   // 151-200 → Strong Follow-up
    mobileNo: '',
    voiceSent: false,
    whatsappSent: false,
  },
  {
    id: '5',
    partyName: 'SHARMA DISTRIBUTORS',
    city: 'MUMBAI',
    billNo: 'INV-204',        // same bill no — ₹50,000 was paid, ₹70,500 still due
    billDate: '05/01/2026',
    agentName: 'DIRECT',
    dueAmount: 70500,
    daysOutstanding: 170,   // 151-200 → Strong Follow-up
    mobileNo: '',
    voiceSent: false,
    whatsappSent: false,
    originalAmount: 120500,
  },
  // Case 2: Past call history rows for BALAJI HARDWARE (read-only, shows prior contacts)
  {
    id: 'bh-past-1',
    partyName: 'BALAJI HARDWARE',
    city: 'BANGALORE',
    billNo: 'INV-412',
    billDate: '20/11/2025',
    agentName: 'DIRECT',
    dueAmount: 210000,
    daysOutstanding: 147,   // days at time of Soft Reminder call (15 Apr)
    mobileNo: '',
    voiceSent: true,
    whatsappSent: false,
    isPastCall: true,
    pastCallSegment: 'Soft Reminder',
    pastCallDate: '15/04/2026',
    pastCallOutcome: 'Called, customer said will pay in 2 weeks',
  },
  {
    id: 'bh-past-2',
    partyName: 'BALAJI HARDWARE',
    city: 'BANGALORE',
    billNo: 'INV-412',
    billDate: '20/11/2025',
    agentName: 'DIRECT',
    dueAmount: 210000,
    daysOutstanding: 160,   // days at time of Follow-up call (28 Apr)
    mobileNo: '',
    voiceSent: true,
    whatsappSent: true,
    isPastCall: true,
    pastCallSegment: 'Follow-up',
    pastCallDate: '28/04/2026',
    pastCallOutcome: 'No commitment given, asked to call back next week',
  },
  // Case 2: Current escalation row for BALAJI HARDWARE
  {
    id: '6',
    partyName: 'BALAJI HARDWARE',
    city: 'BANGALORE',
    billNo: 'INV-412',
    billDate: '20/11/2025',
    agentName: 'DIRECT',
    dueAmount: 210000,
    daysOutstanding: 215,
    mobileNo: '',
    voiceSent: false,
    whatsappSent: false,
    hasCallHistory: true,
  },
  // Case 3: Grace period — party paid, do not call for 15 days
  {
    id: '7',
    partyName: 'MEHTA ENTERPRISES',
    city: 'AHMEDABAD',
    billNo: 'INV-078',
    billDate: '01/03/2026',
    agentName: 'DIRECT',
    dueAmount: 18500,
    daysOutstanding: 45,
    mobileNo: '',
    voiceSent: false,
    whatsappSent: false,
    isPaidGracePeriod: true,
    graceDaysLeft: 15,
  },
];

const getSegment = (days: number, amount: number) => {
  if (amount < 0)  return { label: 'Credit Note',     bg: 'bg-gray-100 text-gray-600',  disabled: false };
  if (days < 90)   return { label: '',                bg: '',                            disabled: true  };
  if (days <= 120) return { label: 'Soft Reminder',   bg: 'badge-soft border-none',      disabled: false };
  if (days <= 150) return { label: 'Follow-up',       bg: 'badge-followup border-none',  disabled: false };
  if (days <= 200) return { label: 'Strong Follow-up',bg: 'badge-strong border-none',    disabled: false };
  return { label: 'Escalation', bg: 'badge-escalation border-none', disabled: false };
};

// ─── Segment notes shown above the table ─────────────────────────────────────
// Consistent card style — same bg/border everywhere, only label color changes
const CARD_BASE = 'bg-[var(--sand)] border-[var(--caramel)]';

const SEGMENT_NOTES = [
  {
    icon: '💬',
    label: 'Soft Reminder (90–120 days)',
    labelColor: 'text-[var(--recovery-green)]',
    note: 'First call — Meena politely informs about pending amount and asks when payment can be made. No pressure.',
  },
  {
    icon: '📅',
    label: 'Follow-up (121–150 days)',
    labelColor: 'text-[var(--walnut)]',
    note: 'Second contact — asks for a specific payment date. Mentions previous reminder. "Ghadi ghadi pareshaan na karun."',
  },
  {
    icon: '⚡',
    label: 'Strong Follow-up (151–200 days)',
    labelColor: 'text-[var(--rust)]',
    note: 'Multiple attempts — firm commitment required. Accounts team is following up. Previous history mentioned briefly.',
  },
  {
    icon: '🔴',
    label: 'Escalation (200+ days)',
    labelColor: 'text-[var(--mahogany)]',
    note: 'Final level — senior management involved. Warm but urgent. Partial payments accepted. Full past history included.',
  },
];

const CASE_NOTES = [
  { icon: Layers,        label: 'Case 1 — Multi-invoice',   labelColor: 'text-[var(--mahogany)]', note: 'GUPTA TRADERS has 2 separate bills (INV-301 + INV-302). Agent receives total due (₹2,05,500) and oldest days, not just one bill.' },
  { icon: History,       label: 'Case 2 — Call History',    labelColor: 'text-[var(--rust)]',     note: 'BALAJI HARDWARE has 2 prior contacts visible in table. Escalation agent receives that history and mentions it naturally.' },
  { icon: Clock,         label: 'Case 3 — Grace Period',    labelColor: 'text-[var(--recovery-green)]', note: 'MEHTA ENTERPRISES paid recently. System blocks calls for 15 days after payment — even if selected in bulk.' },
  { icon: AlertTriangle, label: 'Case 4 — 60-min Gap',      labelColor: 'text-[var(--walnut)]',   note: '60-minute cooldown between calls to same number. Prevents calling the same person twice in quick succession.' },
  { icon: CreditCard,    label: 'Case 5 — Partial Payment', labelColor: 'text-[var(--dark-brown)]', note: 'SHARMA DISTRIBUTORS paid ₹50,000 of ₹1,20,500 (same bill INV-204). Agent says "Aapne ₹50,000 diye the — shukriya" then asks for remaining ₹70,500.' },
];

export default function DemoOutstandingTable({
  token,
  whatsappUsed,
  whatsappAllowed,
  callsUsed,
  callsAllowed,
  phone,
  pastRuns,
  onActionComplete,
}: {
  token: string;
  whatsappUsed: number;
  whatsappAllowed: number;
  callsUsed: number;
  callsAllowed: number;
  phone: string;
  pastRuns: Array<{ party_name: string; demo_type: string; status: string }>;
  onActionComplete: (type: 'WHATSAPP' | 'VOICE_CALL') => void;
}) {
  const [data, setData] = useState<DemoRowData[]>(() => {
    const safeRuns = Array.isArray(pastRuns) ? pastRuns : [];
    const voiceRuns = safeRuns.filter((r) => r.demo_type === 'VOICE_CALL');
    const waRuns = safeRuns.filter((r) => r.demo_type === 'WHATSAPP');
    let voiceMarked = 0;
    let waMarked = 0;
    return initialData.map((row) => {
      const canMarkVoice =
        voiceMarked < callsUsed && voiceRuns.some((r) => r.party_name === row.partyName);
      const canMarkWa =
        waMarked < whatsappUsed && waRuns.some((r) => r.party_name === row.partyName);
      if (canMarkVoice) voiceMarked++;
      if (canMarkWa) waMarked++;
      return { ...row, mobileNo: phone, voiceSent: canMarkVoice, whatsappSent: canMarkWa };
    });
  });

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'WHATSAPP' | 'VOICE_CALL' | null;
    rowId: string | null;
    isBulk: boolean;
  }>({ isOpen: false, type: null, rowId: null, isBulk: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('All Segments');

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const matchesSearch =
        row.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.billNo.toLowerCase().includes(searchQuery.toLowerCase());
      const segment = getSegment(row.daysOutstanding, row.dueAmount).label;
      const matchesSegment = segmentFilter === 'All Segments' || segment === segmentFilter;
      return matchesSearch && matchesSegment;
    });
  }, [data, searchQuery, segmentFilter]);

  const handleEdit = (id: string, field: keyof DemoRowData, value: string | number) => {
    setData((old) => old.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const executeAction = async () => {
    // 🚧 TEMP: quota guards disabled
    // if (modalState.type === 'WHATSAPP' && whatsappUsed >= whatsappAllowed) return;
    // if (modalState.type === 'VOICE_CALL' && callsUsed >= callsAllowed) return;

    setIsSubmitting(true);
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

    try {
      const row = data.find((r) => r.id === modalState.rowId);
      if (!row) return;

      // Case 1: Compute multi-invoice totals for same party (exclude past calls and paid rows).
      // The same bill can appear twice in the demo data (Case 5: original row + after-partial-
      // payment row, same billNo) — only DISTINCT bills count toward the multi-invoice total,
      // and each bill contributes its remaining (lowest) amount, not the sum of its rows.
      const partyRows = data.filter((r) => r.partyName === row.partyName && !r.isPaidGracePeriod && !r.isPastCall);
      const billRemaining = new Map<string, number>();
      const billMaxDays = new Map<string, number>();
      for (const r of partyRows) {
        const prevAmt = billRemaining.get(r.billNo);
        billRemaining.set(r.billNo, prevAmt === undefined ? r.dueAmount : Math.min(prevAmt, r.dueAmount));
        billMaxDays.set(r.billNo, Math.max(billMaxDays.get(r.billNo) ?? 0, r.daysOutstanding));
      }
      const distinctBillCount = billRemaining.size;
      const totalDueForParty = Array.from(billRemaining.values()).reduce((sum, v) => sum + v, 0);
      const maxDaysForParty = Math.max(...Array.from(billMaxDays.values()));

      // Segment uses max days across all bills so agent tone matches worst-case overdue
      const effectiveDaysForSegment = distinctBillCount > 1 ? maxDaysForParty : row.daysOutstanding;
      const effectiveAmountForSegment = distinctBillCount > 1 ? totalDueForParty : row.dueAmount;
      const segment = getSegment(effectiveDaysForSegment, effectiveAmountForSegment).label;

      // Case 5: Partial payment — either flagged via originalAmount OR detected via same bill no. with higher amount row
      const sameBillHigherRow = data.find(
        (r) => r.billNo === row.billNo && r.partyName === row.partyName && r.dueAmount > row.dueAmount
      );
      const effectiveOriginal = row.originalAmount ?? sameBillHigherRow?.dueAmount;
      const previousPaidAmount = effectiveOriginal ? effectiveOriginal - row.dueAmount : undefined;
      const totalOriginalAmount = effectiveOriginal;

      // WhatsApp statement PDF: one row per distinct open bill of this party,
      // each with its remaining due and its own segment status
      const invoices = Array.from(billRemaining.entries()).map(([billNo, remaining]) => {
        const billRow = partyRows.find((r) => r.billNo === billNo)!;
        const days = billMaxDays.get(billNo) ?? billRow.daysOutstanding;
        return {
          billNo,
          billDate: billRow.billDate,
          billAmount: billRow.originalAmount ?? Math.max(...partyRows.filter((r) => r.billNo === billNo).map((r) => r.dueAmount)),
          dueAmount: remaining,
          daysOverdue: days,
          status: getSegment(days, remaining).label || 'Pending',
        };
      });

      const res = await fetch(`${backendUrl}/api/v1/demo-leads/${token}/run-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demoType: modalState.type,
          partyName: row.partyName,
          mobileNumber: row.mobileNo,
          dueAmount: row.dueAmount,
          daysOverdue: row.daysOutstanding,
          billNo: row.billNo,
          segment,
          previousPaidAmount,
          totalOriginalAmount,
          totalDueForParty: distinctBillCount > 1 ? totalDueForParty : undefined,
          maxDaysForParty: distinctBillCount > 1 ? maxDaysForParty : undefined,
          city: row.city,
          agentName: row.agentName,
          invoices: modalState.type === 'WHATSAPP' ? invoices : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.message || 'Action failed');
      }

      const resData = await res.json();

      setData((old) =>
        old.map((r) =>
          r.id === modalState.rowId
            ? {
                ...r,
                voiceSent: modalState.type === 'VOICE_CALL' ? true : r.voiceSent,
                whatsappSent: modalState.type === 'WHATSAPP' ? true : r.whatsappSent,
              }
            : r,
        ),
      );

      onActionComplete(modalState.type!);
      setModalState({ isOpen: false, type: null, rowId: null, isBulk: false });
      const fallbackMsg = modalState.type === 'WHATSAPP'
        ? 'WhatsApp statement sent — check your WhatsApp!'
        : 'Calling you now — answer your phone!';
      alert(`${modalState.type === 'WHATSAPP' ? '💬' : '📞'} ${resData.data?.message || resData.message || fallbackMsg}`);
    } catch (e: any) {
      alert(`❌ ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo<ColumnDef<DemoRowData>[]>(
    () => [
      {
        accessorKey: 'partyName',
        header: 'Party Name',
        cell: ({ row, getValue }) => (
          <div className="flex items-center gap-1.5">
            <span className={cn('font-medium text-[12px] sm:text-[13px]', row.original.isPaidGracePeriod && 'text-[var(--walnut)] line-through')}>
              {getValue() as string}
            </span>
            {row.original.isMultiInvoice && (
              <span title="Multi-invoice party — agent receives total outstanding">
                <Layers className="h-3.5 w-3.5 text-purple-500" />
              </span>
            )}
            {row.original.hasCallHistory && (
              <span title="Past calls exist — agent receives interaction history">
                <History className="h-3.5 w-3.5 text-orange-500" />
              </span>
            )}
            {row.original.originalAmount && (
              <span title={`Partial payment: ₹${(row.original.originalAmount - row.original.dueAmount).toLocaleString('en-IN')} paid earlier`}>
                <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
              </span>
            )}
            {row.original.isPaidGracePeriod && (
              <span title={`Paid — ${row.original.graceDaysLeft} days grace period remaining`}>
                <Clock className="h-3.5 w-3.5 text-teal-500" />
              </span>
            )}
          </div>
        ),
      },
      { accessorKey: 'city', header: 'City' },
      { accessorKey: 'billNo', header: 'Bill No.' },
      { accessorKey: 'billDate', header: 'Bill Date' },
      { accessorKey: 'agentName', header: 'Agent' },
      {
        accessorKey: 'dueAmount',
        header: 'Due Amount (₹)',
        cell: ({ row, getValue }) => (
          <div>
            <span className={cn('font-medium text-[12px] sm:text-[13px]', row.original.isPaidGracePeriod ? 'text-teal-600' : 'text-[var(--walnut)]')}>
              ₹{(getValue() as number).toLocaleString('en-IN')}
            </span>
            {row.original.originalAmount && (
              <div className="text-[11px] text-[var(--walnut)] opacity-60 line-through">
                ₹{row.original.originalAmount.toLocaleString('en-IN')}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'daysOutstanding',
        header: 'Days',
        cell: ({ row, getValue }) => (
          <span className={cn('font-medium text-[12px] sm:text-[13px]', row.original.isPaidGracePeriod ? 'text-teal-600' : 'text-[var(--walnut)]')}>
            {row.original.isPaidGracePeriod ? `Grace: ${row.original.graceDaysLeft}d` : (getValue() as number)}
          </span>
        ),
      },
      {
        id: 'segment',
        header: 'Segment',
        cell: ({ row }) => {
          if (row.original.isPastCall) {
            return (
              <span className="whitespace-nowrap rounded-full px-2.5 py-1 font-body text-[11px] font-semibold tracking-wide bg-[var(--caramel)]/30 text-[var(--walnut)]">
                {row.original.pastCallSegment}
              </span>
            );
          }
          if (row.original.isPaidGracePeriod) {
            return (
              <span className="whitespace-nowrap rounded-full px-2.5 py-1 font-body text-[11px] font-semibold tracking-wide bg-[var(--recovery-green)]/15 text-[var(--recovery-green)]">
                Paid · Grace Period
              </span>
            );
          }
          // Case 1: multi-invoice — use MAX days across all bills of this party for segment
          const effectiveDays = row.original.isMultiInvoice
            ? Math.max(...data.filter(r => r.partyName === row.original.partyName && !r.isPaidGracePeriod && !r.isPastCall).map(r => r.daysOutstanding))
            : row.original.daysOutstanding;
          const seg = getSegment(effectiveDays, row.original.dueAmount);
          if (seg.disabled) {
            return <span className="text-[var(--walnut)] opacity-40 text-[12px] sm:text-[13px]">—</span>;
          }
          return (
            <span className={cn('whitespace-nowrap rounded-full px-2.5 py-1 font-body text-[11px] font-semibold tracking-wide', seg.bg)}>
              {seg.label}
            </span>
          );
        },
      },
      {
        accessorKey: 'mobileNo',
        header: 'Mobile No.',
        cell: ({ row, getValue }) =>
          row.original.isPastCall || row.original.isPaidGracePeriod ? (
            <span className="text-[12px] sm:text-[13px] text-[var(--walnut)] opacity-50">—</span>
          ) : (
            <MobileInput value={getValue() as string} onCommit={(val) => handleEdit(row.original.id, 'mobileNo', val)} />
          ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const daysForStatus = row.original.isMultiInvoice
            ? Math.max(...data.filter(r => r.partyName === row.original.partyName && !r.isPaidGracePeriod && !r.isPastCall).map(r => r.daysOutstanding))
            : row.original.daysOutstanding;
          if (!row.original.isPastCall && !row.original.isPaidGracePeriod && daysForStatus < 90) {
            return <span className="text-[var(--walnut)] opacity-30 text-[12px] sm:text-[13px]">—</span>;
          }
          if (row.original.isPastCall) {
            return (
              <span className="text-[11px] text-[var(--walnut)] italic leading-snug">
                {row.original.pastCallOutcome}
              </span>
            );
          }
          if (row.original.isPaidGracePeriod) {
            return <span className="text-[12px] font-medium text-[var(--recovery-green)]">✓ Payment received</span>;
          }
          const { voiceSent, whatsappSent } = row.original;
          const statuses = [];
          if (voiceSent) statuses.push('Call Sent');
          if (whatsappSent) statuses.push('WA Sent');
          if (statuses.length > 0) {
            return (
              <div className="flex flex-col gap-1 text-green-600 font-medium text-[12px]">
                {statuses.map((s) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {s}
                  </div>
                ))}
              </div>
            );
          }
          return <span className="text-[var(--walnut)] text-[12px] sm:text-[13px]">Pending</span>;
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          if (row.original.isPastCall) {
            return (
              <span className="text-[11px] text-[var(--walnut)] opacity-60 font-medium">
                {row.original.pastCallDate}
              </span>
            );
          }

          if (row.original.isPaidGracePeriod) {
            return (
              <span
                title={`No calls for ${row.original.graceDaysLeft} more days — payment received recently`}
                className="flex items-center gap-1 text-[11px] text-[var(--recovery-green)] font-medium cursor-help"
              >
                <Clock className="h-3.5 w-3.5" />
                {row.original.graceDaysLeft}d grace
              </span>
            );
          }

          const effectiveDaysForAction = row.original.isMultiInvoice
            ? Math.max(...data.filter(r => r.partyName === row.original.partyName && !r.isPaidGracePeriod && !r.isPastCall).map(r => r.daysOutstanding))
            : row.original.daysOutstanding;
          const rowSeg = getSegment(effectiveDaysForAction, row.original.dueAmount);
          if (rowSeg.disabled) {
            return (
              <div className="flex gap-2">
                <button disabled className="rounded p-1.5 text-[var(--walnut)] opacity-20 cursor-not-allowed">
                  <MessageCircle className="h-4 w-4" />
                </button>
                <button disabled className="rounded p-1.5 text-[var(--walnut)] opacity-20 cursor-not-allowed">
                  <Phone className="h-4 w-4" />
                </button>
              </div>
            );
          }

          // 🚧 TEMP: quota checks disabled — all buttons show enabled
          // const quotaExhausted = callsUsed >= callsAllowed;
          // const waQuotaExhausted = whatsappUsed >= whatsappAllowed;
          const quotaExhausted = false;
          const waQuotaExhausted = false;
          const { voiceSent, whatsappSent } = row.original;

          const handleCallClick = () => {
            if (voiceSent && !quotaExhausted) {
              setData((old) =>
                old.map((r) => (r.id === row.original.id ? { ...r, voiceSent: false } : r)),
              );
            } else if (!voiceSent && !quotaExhausted) {
              setModalState({ isOpen: true, type: 'VOICE_CALL', rowId: row.original.id, isBulk: false });
            }
          };

          const handleWaClick = () => {
            if (whatsappSent && !waQuotaExhausted) {
              setData((old) =>
                old.map((r) => (r.id === row.original.id ? { ...r, whatsappSent: false } : r)),
              );
            } else if (!whatsappSent && !waQuotaExhausted) {
              setModalState({ isOpen: true, type: 'WHATSAPP', rowId: row.original.id, isBulk: false });
            }
          };

          return (
            <div className="flex gap-2">
              <button
                onClick={handleWaClick}
                disabled={waQuotaExhausted && !whatsappSent}
                className={`rounded p-1.5 transition-colors ${
                  whatsappSent && !waQuotaExhausted
                    ? 'text-green-600 hover:bg-red-50 hover:text-red-500'
                    : 'text-[var(--walnut)] hover:bg-[var(--rust)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--walnut)]'
                }`}
                title={whatsappSent && !waQuotaExhausted ? 'WA Sent — click to reset' : 'Send WhatsApp Demo'}
              >
                <MessageCircle className="h-4 w-4" />
              </button>
              <button
                onClick={handleCallClick}
                disabled={quotaExhausted && !voiceSent}
                className={`rounded p-1.5 transition-colors ${
                  voiceSent && !quotaExhausted
                    ? 'text-green-600 hover:bg-red-50 hover:text-red-500'
                    : 'text-[var(--walnut)] hover:bg-[var(--mahogany)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--walnut)]'
                }`}
                title={voiceSent && !quotaExhausted ? 'Call Sent — click to reset' : 'Make AI Call Demo'}
              >
                <Phone className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [whatsappUsed, whatsappAllowed, callsUsed, callsAllowed, setData],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // 🚧 TEMP: always false so modal never shows "limit reached"
  // const isExhausted =
  //   (modalState.type === 'WHATSAPP' && whatsappUsed >= whatsappAllowed) ||
  //   (modalState.type === 'VOICE_CALL' && callsUsed >= callsAllowed);
  const isExhausted = false;
  const targetRow = modalState.rowId ? data.find((r) => r.id === modalState.rowId) : null;

  return (
    <div className="space-y-6">
      {/* ── Segment behaviour notes ── */}
      <div>
        <p className="mb-3 font-display text-[12px] sm:text-[13px] font-semibold text-[var(--mahogany)] uppercase tracking-wider">
          How each segment works
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {SEGMENT_NOTES.map((s) => (
            <div key={s.label} className={cn('rounded-xl border px-4 py-3', CARD_BASE)}>
              <p className={cn('font-display text-[12px] font-bold mb-1', s.labelColor)}>{s.icon} {s.label}</p>
              <p className="font-body text-[12px] leading-snug text-[var(--walnut)]">{s.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Intelligence case notes ── */}
      <div>
        <p className="mb-3 font-display text-[12px] sm:text-[13px] font-semibold text-[var(--mahogany)] uppercase tracking-wider">
          5 intelligence cases in this demo
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {CASE_NOTES.map((c) => (
            <div key={c.label} className={cn('rounded-xl border px-4 py-3', CARD_BASE)}>
              <div className={cn('flex items-center gap-1.5 mb-1', c.labelColor)}>
                <c.icon className="h-3.5 w-3.5" />
                <p className="font-display text-[11px] font-bold">{c.label}</p>
              </div>
              <p className="font-body text-[11px] leading-snug text-[var(--walnut)]">{c.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] shadow-sm overflow-hidden">
        <DemoFiltersBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          segmentFilter={segmentFilter}
          setSegmentFilter={setSegmentFilter}
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left font-body text-sm">
            <thead className="bg-[var(--sand)] text-[11px] sm:text-[13px] font-semibold text-[var(--dark-brown)] border-b border-[var(--caramel)]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-3 py-2.5 sm:px-4 sm:py-3 whitespace-nowrap">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[var(--caramel)] text-[var(--dark-brown)]">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'transition-colors',
                    row.original.isPastCall
                      ? 'opacity-50 bg-[var(--caramel)]/5 border-l-2 border-l-[var(--caramel)]'
                      : row.original.isPaidGracePeriod
                      ? 'opacity-60 bg-[var(--recovery-green)]/5'
                      : 'hover:bg-[var(--cream)]',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 sm:px-4 sm:py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DemoConfirmModal
          isOpen={modalState.isOpen}
          isSubmitting={isSubmitting}
          isExhausted={isExhausted}
          onClose={() => setModalState({ ...modalState, isOpen: false })}
          onConfirm={executeAction}
          title={
            isExhausted
              ? 'Demo limit reached'
              : `Confirm Demo ${modalState.type === 'WHATSAPP' ? 'Message' : 'Call'}`
          }
          description={
            isExhausted
              ? "You've used this free demo action. Want to see this live on your real data? Talk to our team."
              : `Trigger a demo ${modalState.type === 'WHATSAPP' ? 'WhatsApp message' : 'AI voice call'} to ${targetRow?.partyName} (${targetRow?.mobileNo})?`
          }
          actionText={modalState.type === 'WHATSAPP' ? 'Send WhatsApp' : 'Make Call'}
        />
      </div>
    </div>
  );
}
