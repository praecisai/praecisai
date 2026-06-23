'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { MessageCircle, Phone, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import DemoConfirmModal from './DemoConfirmModal';
import DemoFiltersBar from './DemoFiltersBar';

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
};

const initialData: DemoRowData[] = [
  { id: '1', partyName: 'RAMESHWAR TEXTILES', city: 'MUMBAI', billNo: '101', billDate: '15/03/2026', agentName: 'DIRECT', dueAmount: 45000, daysOutstanding: 95, mobileNo: '919876543210', voiceSent: false, whatsappSent: false },
  { id: '2', partyName: 'SHARMA DISTRIBUTORS', city: 'DELHI', billNo: '204', billDate: '10/02/2026', agentName: 'DIRECT', dueAmount: 120500, daysOutstanding: 130, mobileNo: '919876543211', voiceSent: false, whatsappSent: false },
  { id: '3', partyName: 'SHARMA DISTRIBUTORS', city: 'DELHI', billNo: '204', billDate: '05/01/2026', agentName: 'DIRECT', dueAmount: 70500, daysOutstanding: 160, mobileNo: '919876543211', voiceSent: false, whatsappSent: false },
  { id: '4', partyName: 'BALAJI HARDWARE', city: 'BANGALORE', billNo: '412', billDate: '20/11/2025', agentName: 'DIRECT', dueAmount: 210000, daysOutstanding: 215, mobileNo: '919876543213', voiceSent: false, whatsappSent: false },
];

const getSegment = (days: number, amount: number) => {
  if (amount < 0) return { label: 'Credit Note', bg: 'bg-gray-100', text: 'text-gray-600' };
  if (days <= 120) return { label: 'Soft Reminder', bg: 'badge-soft border-none' };
  if (days <= 150) return { label: 'Follow-up', bg: 'badge-followup border-none' };
  if (days <= 200) return { label: 'Strong Follow-up', bg: 'badge-strong border-none' };
  return { label: 'Escalation', bg: 'badge-escalation border-none' };
};

export default function DemoOutstandingTable({ 
  token, 
  whatsappUsed, 
  whatsappAllowed, 
  callsUsed, 
  callsAllowed,
  phone,
  onActionComplete 
}: { 
  token: string, 
  whatsappUsed: number, 
  whatsappAllowed: number, 
  callsUsed: number, 
  callsAllowed: number,
  phone: string,
  onActionComplete: (type: 'WHATSAPP' | 'VOICE_CALL') => void 
}) {
  const [data, setData] = useState<DemoRowData[]>(initialData.map(row => ({ ...row, mobileNo: phone })));
  const [modalState, setModalState] = useState<{ isOpen: boolean; type: 'WHATSAPP' | 'VOICE_CALL' | null; rowId: string | null; isBulk: boolean }>({ isOpen: false, type: null, rowId: null, isBulk: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('All Segments');

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const matchesSearch = row.partyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            row.billNo.toLowerCase().includes(searchQuery.toLowerCase());
      const segment = getSegment(row.daysOutstanding, row.dueAmount).label;
      const matchesSegment = segmentFilter === 'All Segments' || segment === segmentFilter;
      
      return matchesSearch && matchesSegment;
    });
  }, [data, searchQuery, segmentFilter]);

  const handleEdit = (id: string, field: keyof DemoRowData, value: string | number) => {
    setData((old) =>
      old.map((row) => {
        if (row.id === id) {
          return { ...row, [field]: value };
        }
        return row;
      })
    );
  };



  const executeAction = async () => {
    if (modalState.type === 'WHATSAPP' && whatsappUsed >= whatsappAllowed) return;
    if (modalState.type === 'VOICE_CALL' && callsUsed >= callsAllowed) return;

    setIsSubmitting(true);
    
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    
    try {
      const row = data.find(r => r.id === modalState.rowId);
      if (!row) return;

        const segment = row.daysOutstanding < 120 ? 'Soft Reminder' : row.daysOutstanding < 150 ? 'Follow-up' : row.daysOutstanding < 200 ? 'Strong Follow-up' : 'Escalation';
        
        // Try to find a previous bill row to calculate partial payment
        const originalBillRow = data.find(r => r.billNo === row.billNo && r.dueAmount > row.dueAmount);
        const previousPaidAmount = originalBillRow ? originalBillRow.dueAmount - row.dueAmount : undefined;

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
          })
        });

      if (!res.ok) throw new Error('Action failed');
      const resData = await res.json();
      
      setData((old) => old.map(r => {
        if (r.id === modalState.rowId) {
          return {
            ...r,
            voiceSent: modalState.type === 'VOICE_CALL' ? true : r.voiceSent,
            whatsappSent: modalState.type === 'WHATSAPP' ? true : r.whatsappSent,
          };
        }
        return r;
      }));

      onActionComplete(modalState.type!);
      setModalState({ isOpen: false, type: null, rowId: null, isBulk: false });
      
      // The prompt requested a toast, but using alert since no toast library is present
      alert(`📞 ${resData.message || 'Calling you now — answer your phone!'}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo<ColumnDef<DemoRowData>[]>(
    () => [
      { accessorKey: 'partyName', header: 'Party Name' },
      { accessorKey: 'city', header: 'City' },
      { accessorKey: 'billNo', header: 'Bill No.' },
      { accessorKey: 'billDate', header: 'Bill Date' },
      { accessorKey: 'agentName', header: 'Agent Name' },
      {
        accessorKey: 'dueAmount',
        header: 'Due Amount (₹)',
        cell: ({ row, getValue }) => (
          <input
            type="number"
            value={getValue() as number}
            onChange={(e) => handleEdit(row.original.id, 'dueAmount', Number(e.target.value))}
            className="w-24 rounded border border-transparent px-2 py-1 focus:border-[var(--mahogany)] focus:outline-none focus:ring-1 focus:ring-[var(--mahogany)] bg-transparent hover:bg-[var(--surface-warm)]"
          />
        ),
      },
      {
        accessorKey: 'daysOutstanding',
        header: 'Days',
        cell: ({ row, getValue }) => (
          <input
            type="number"
            value={getValue() as number}
            onChange={(e) => handleEdit(row.original.id, 'daysOutstanding', Number(e.target.value))}
            className="w-16 rounded border border-transparent px-2 py-1 focus:border-[var(--mahogany)] focus:outline-none focus:ring-1 focus:ring-[var(--mahogany)] bg-transparent hover:bg-[var(--surface-warm)]"
          />
        ),
      },
      {
        id: 'segment',
        header: 'Segment',
        cell: ({ row }) => {
          const seg = getSegment(row.original.daysOutstanding, row.original.dueAmount);
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
        cell: ({ row, getValue }) => (
          <input
            type="text"
            value={getValue() as string}
            onChange={(e) => handleEdit(row.original.id, 'mobileNo', e.target.value)}
            className="w-28 rounded border border-transparent px-2 py-1 focus:border-[var(--mahogany)] focus:outline-none focus:ring-1 focus:ring-[var(--mahogany)] bg-transparent hover:bg-[var(--surface-warm)] text-[13px]"
          />
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const { voiceSent, whatsappSent } = row.original;
          const statuses = [];
          if (voiceSent) statuses.push('Call Sent');
          if (whatsappSent) statuses.push('WA Sent');

          if (statuses.length > 0) {
            return (
              <div className="flex flex-col gap-1 text-green-600 font-medium text-[12px]">
                {statuses.map(s => (
                  <div key={s} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {s}
                  </div>
                ))}
              </div>
            );
          }
          return <span className="text-[var(--walnut)] text-[13px]">Pending</span>;
        }
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <button
              onClick={() => setModalState({ isOpen: true, type: 'WHATSAPP', rowId: row.original.id, isBulk: false })}
              className="rounded p-1.5 text-[var(--walnut)] hover:bg-[var(--rust)] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--walnut)]"
              title="Send WhatsApp Demo"
              disabled={row.original.whatsappSent || whatsappUsed >= whatsappAllowed}
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            <button
              onClick={() => setModalState({ isOpen: true, type: 'VOICE_CALL', rowId: row.original.id, isBulk: false })}
              className="rounded p-1.5 text-[var(--walnut)] hover:bg-[var(--mahogany)] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--walnut)]"
              title="Make AI Call Demo"
              disabled={row.original.voiceSent || callsUsed >= callsAllowed}
            >
              <Phone className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [whatsappUsed, whatsappAllowed, callsUsed, callsAllowed]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const isExhausted = (modalState.type === 'WHATSAPP' && whatsappUsed >= whatsappAllowed) || (modalState.type === 'VOICE_CALL' && callsUsed >= callsAllowed);
  const targetRow = modalState.rowId ? data.find(r => r.id === modalState.rowId) : null;
  return (
    <div className="rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] shadow-sm overflow-hidden">
      <DemoFiltersBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        segmentFilter={segmentFilter}
        setSegmentFilter={setSegmentFilter}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-left font-body text-sm">
          <thead className="bg-[var(--sand)] text-[13px] font-semibold text-[var(--dark-brown)] border-b border-[var(--caramel)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 whitespace-nowrap">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[var(--caramel)] text-[var(--dark-brown)]">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--cream)] transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-2.5">
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
        title={isExhausted ? "Demo limit reached" : `Confirm Demo ${modalState.type === 'WHATSAPP' ? 'Message' : 'Call'}`}
        description={
          isExhausted 
            ? "You've used this free demo action. Want to see this live on your real data? Talk to our team." 
            : `Are you sure you want to trigger a demo ${modalState.type === 'WHATSAPP' ? 'WhatsApp message' : 'AI voice call'} to ${targetRow?.partyName} (${targetRow?.mobileNo})?`
        }
        actionText={modalState.type === 'WHATSAPP' ? 'Send WhatsApp' : 'Make Call'}
      />
    </div>
  );
}
