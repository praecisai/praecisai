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
import { MessageCircle, Phone, CheckCircle2, Ban, RotateCcw } from 'lucide-react';
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
  callStatus: 'Pending' | 'Sent' | 'Skipped';
};

const initialData: DemoRowData[] = [
  { id: '1', partyName: '59 COLOURS', city: 'LUDHIANA', billNo: '2526/10/A-5397', billDate: '09/03/2026', agentName: 'AERO-CHIRAG BHAI', dueAmount: 50364, daysOutstanding: 87, mobileNo: '918291485811', callStatus: 'Pending' },
  { id: '2', partyName: '59 COLOURS', city: 'LUDHIANA', billNo: '2526/10/A-5642', billDate: '18/03/2026', agentName: 'AERO-CHIRAG BHAI', dueAmount: 52469, daysOutstanding: 78, mobileNo: '917304862949', callStatus: 'Pending' },
  { id: '3', partyName: '59 COLOURS', city: 'LUDHIANA', billNo: '2627/10/A-132', billDate: '11/04/2026', agentName: 'AERO-CHIRAG BHAI', dueAmount: 34204, daysOutstanding: 54, mobileNo: '918291485811', callStatus: 'Pending' },
  { id: '4', partyName: 'A TO Z COLLECTION', city: 'JAUNPUR', billNo: '2526/10/A-4706', billDate: '08/02/2026', agentName: 'AERO-PRATHAM ENTERPRISES', dueAmount: 38530, daysOutstanding: 116, mobileNo: '918291485811', callStatus: 'Pending' },
  { id: '5', partyName: 'A TO Z COLLECTION', city: 'JAUNPUR', billNo: '2526/10/A-5314', billDate: '05/03/2026', agentName: 'AERO-PRATHAM ENTERPRISES', dueAmount: 13010, daysOutstanding: 91, mobileNo: '917304862949', callStatus: 'Pending' },
  { id: '6', partyName: 'ABHISHEK READYMADES (KOTA)', city: 'KOTA', billNo: '2526/10/A-2519', billDate: '17/09/2025', agentName: 'AERO-DIRECT', dueAmount: 46117, daysOutstanding: 260, mobileNo: '917678058166', callStatus: 'Pending' },
];

const getSegment = (days: number, amount: number) => {
  if (amount < 0) return { label: 'Credit Note', bg: 'bg-gray-100', text: 'text-gray-600' };
  if (days <= 60) return { label: 'Soft Reminder', bg: 'badge-soft border-none' };
  if (days <= 120) return { label: 'Follow-up', bg: 'badge-followup border-none' };
  if (days <= 180) return { label: 'Strong Follow-up', bg: 'badge-strong border-none' };
  return { label: 'Escalation', bg: 'badge-escalation border-none' };
};

export default function DemoOutstandingTable({ token, demosUsed, demosAllowed, onActionComplete }: { token: string, demosUsed: number, demosAllowed: number, onActionComplete: () => void }) {
  const [data, setData] = useState<DemoRowData[]>(initialData);
  const [rowSelection, setRowSelection] = useState({});
  const [modalState, setModalState] = useState<{ isOpen: boolean; type: 'WHATSAPP' | 'VOICE_CALL' | null; rowId: string | null; isBulk: boolean }>({ isOpen: false, type: null, rowId: null, isBulk: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('All Cities');
  const [segmentFilter, setSegmentFilter] = useState('All Segments');

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const matchesSearch = row.partyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            row.billNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCity = cityFilter === 'All Cities' || row.city === cityFilter;
      const segment = getSegment(row.daysOutstanding, row.dueAmount).label;
      const matchesSegment = segmentFilter === 'All Segments' || segment === segmentFilter;
      
      return matchesSearch && matchesCity && matchesSegment;
    });
  }, [data, searchQuery, cityFilter, segmentFilter]);

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

  const handleSkip = (id: string) => {
    setData((old) => old.map(r => r.id === id ? { ...r, callStatus: 'Skipped' } : r));
  };

  const handleUnskip = (id: string) => {
    setData((old) => old.map(r => r.id === id ? { ...r, callStatus: 'Pending' } : r));
  };

  const executeAction = async () => {
    if (demosUsed >= demosAllowed) return;

    setIsSubmitting(true);
    
    // Check if bulk
    if (modalState.isBulk) {
      // MOCK BULK LOGIC (just UI update)
      setTimeout(() => {
        const selectedIds = Object.keys(rowSelection).map(index => filteredData[Number(index)].id);
        setData((old) => old.map(r => selectedIds.includes(r.id) && r.callStatus !== 'Skipped' ? { ...r, callStatus: 'Sent' } : r));
        setRowSelection({});
        onActionComplete();
        setModalState({ isOpen: false, type: null, rowId: null, isBulk: false });
        setIsSubmitting(false);
      }, 800);
      return;
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    try {
      const row = data.find(r => r.id === modalState.rowId);
      if (!row) return;

      const res = await fetch(`${backendUrl}/api/v1/demo-leads/${token}/run-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demoType: modalState.type,
          partyName: row.partyName,
          mobileNumber: row.mobileNo,
          dueAmount: row.dueAmount,
          daysOverdue: row.daysOutstanding,
        })
      });

      if (!res.ok) throw new Error('Action failed');
      
      setData((old) => old.map(r => r.id === modalState.rowId ? { ...r, callStatus: 'Sent' } : r));
      onActionComplete();
      setModalState({ isOpen: false, type: null, rowId: null, isBulk: false });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo<ColumnDef<DemoRowData>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="rounded border-[var(--caramel)] text-[var(--mahogany)] focus:ring-[var(--mahogany)]"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="rounded border-[var(--caramel)] text-[var(--mahogany)] focus:ring-[var(--mahogany)]"
          />
        ),
      },
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
        accessorKey: 'callStatus',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue() as string;
          if (status === 'Sent') {
            return <div className="flex items-center gap-1.5 text-green-600 font-medium text-[13px]"><CheckCircle2 className="h-4 w-4" /> Sent</div>;
          }
          if (status === 'Skipped') {
            return <div className="flex items-center gap-1.5 text-gray-500 font-medium text-[13px]"><Ban className="h-4 w-4" /> Skipped</div>;
          }
          return <span className="text-[var(--walnut)] text-[13px]">{status}</span>;
        }
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <button
              onClick={() => setModalState({ isOpen: true, type: 'WHATSAPP', rowId: row.original.id, isBulk: false })}
              className="rounded p-1.5 text-[var(--walnut)] hover:bg-[var(--rust)] hover:text-white transition-colors"
              title="Send WhatsApp Demo"
              disabled={row.original.callStatus === 'Skipped'}
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            <button
              onClick={() => setModalState({ isOpen: true, type: 'VOICE_CALL', rowId: row.original.id, isBulk: false })}
              className="rounded p-1.5 text-[var(--walnut)] hover:bg-[var(--mahogany)] hover:text-white transition-colors"
              title="Make AI Call Demo"
              disabled={row.original.callStatus === 'Skipped'}
            >
              <Phone className="h-4 w-4" />
            </button>
            {row.original.callStatus !== 'Skipped' ? (
              <button
                onClick={() => handleSkip(row.original.id)}
                className="rounded p-1.5 text-[var(--walnut)] hover:bg-gray-200 hover:text-gray-700 transition-colors"
                title="Skip this party"
                disabled={row.original.callStatus === 'Sent'}
              >
                <Ban className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => handleUnskip(row.original.id)}
                className="rounded p-1.5 text-gray-400 hover:bg-green-100 hover:text-green-700 transition-colors"
                title="Unskip this party"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const isExhausted = demosUsed >= demosAllowed;
  const targetRow = modalState.rowId ? data.find(r => r.id === modalState.rowId) : null;
  const selectedCount = Object.keys(rowSelection).length;

  const handleBulkSkip = () => {
    const selectedIds = Object.keys(rowSelection).map(index => filteredData[Number(index)].id);
    setData((old) => old.map(r => selectedIds.includes(r.id) ? { ...r, callStatus: 'Skipped' } : r));
    setRowSelection({});
  };

  const handleBulkUnskip = () => {
    const selectedIds = Object.keys(rowSelection).map(index => filteredData[Number(index)].id);
    setData((old) => old.map(r => selectedIds.includes(r.id) && r.callStatus === 'Skipped' ? { ...r, callStatus: 'Pending' } : r));
    setRowSelection({});
  };

  return (
    <div className="rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] shadow-sm overflow-hidden">
      
      <DemoFiltersBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        cityFilter={cityFilter}
        setCityFilter={setCityFilter}
        segmentFilter={segmentFilter}
        setSegmentFilter={setSegmentFilter}
      />

      {selectedCount > 0 && (
        <div className="flex items-center justify-between bg-[var(--cream)] px-6 py-3 border-b border-[var(--caramel)]">
          <span className="font-body text-[13px] font-semibold text-[var(--mahogany)]">
            {selectedCount} row{selectedCount > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-3">
            <button 
              onClick={() => setModalState({ isOpen: true, type: 'WHATSAPP', rowId: null, isBulk: true })}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--rust)] px-3 py-1.5 font-body text-xs font-semibold text-white transition-colors hover:bg-[var(--mahogany)]"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Bulk WhatsApp
            </button>
            <button 
              onClick={() => setModalState({ isOpen: true, type: 'VOICE_CALL', rowId: null, isBulk: true })}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--mahogany)] px-3 py-1.5 font-body text-xs font-semibold text-white transition-colors hover:bg-[var(--dark-brown)]"
            >
              <Phone className="h-3.5 w-3.5" />
              Bulk Call
            </button>
            <button 
              onClick={handleBulkSkip}
              className="flex items-center gap-1.5 rounded-lg bg-gray-200 px-3 py-1.5 font-body text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-300"
            >
              <Ban className="h-3.5 w-3.5" />
              Skip Selected
            </button>
            <button 
              onClick={handleBulkUnskip}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-body text-xs font-semibold text-gray-600 transition-colors hover:border-green-200 hover:bg-green-50 hover:text-green-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Unskip
            </button>
          </div>
        </div>
      )}

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
            ? "You've used both free demo actions. Want to see this live on your real data? Talk to our team." 
            : modalState.isBulk
              ? `Are you sure you want to trigger bulk ${modalState.type === 'WHATSAPP' ? 'WhatsApp messages' : 'AI voice calls'} to ${selectedCount} selected parties?`
              : `Are you sure you want to trigger a demo ${modalState.type === 'WHATSAPP' ? 'WhatsApp message' : 'AI voice call'} to ${targetRow?.partyName} (${targetRow?.mobileNo})?`
        }
        actionText={modalState.type === 'WHATSAPP' ? 'Send WhatsApp' : 'Make Call'}
      />
    </div>
  );
}
