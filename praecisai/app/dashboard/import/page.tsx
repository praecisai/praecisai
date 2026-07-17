'use client';

import { useEffect, useRef, useState } from 'react';
import { TopHeader } from '../../../components/layout/Sidebar';
import { useUploadImport, useExecuteImport, useImportHistory } from '../../../lib/api/hooks';
import { formatDate } from '../../../lib/utils/format';
import { StatusBadge } from '../../../components/shared/SegmentBadge';
import { AlertCircle, FileSpreadsheet, History, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { ColumnMapping } from '../../../types';

// One-click import: drop the file → columns are auto-detected (Party, Bill No,
// Due Amount, Mobile, Agent, City …) → data imports immediately. No mapping
// steps: if the required columns can't be found, the user gets a clear error.

type Phase = 'idle' | 'running' | 'done';

const STAGES = [
  { at: 0, label: 'Uploading file…' },
  { at: 30, label: 'Detecting columns (Party, Bill No., Due Amount, Mobile, Agent)…' },
  { at: 45, label: 'Reading rows & extracting cities from party names…' },
  { at: 65, label: 'Creating & updating customers and invoices…' },
  { at: 85, label: 'Recalculating segments & outstanding totals…' },
  { at: 100, label: 'Done!' },
];

function ProgressBar({ progress }: { progress: number }) {
  const stage = [...STAGES].reverse().find((s) => progress >= s.at) ?? STAGES[0];
  return (
    <div className="max-w-xl mx-auto py-10 px-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium" style={{ color: 'var(--dark-brown)' }}>{stage.label}</p>
        <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--mahogany)' }}>{Math.round(progress)}%</p>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--sand)', border: '1px solid var(--caramel)' }}>
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, var(--walnut), var(--mahogany))',
          }}
        />
      </div>
      <p className="text-xs mt-3 text-center" style={{ color: 'var(--walnut)' }}>
        Please keep this tab open: large Tally exports can take a minute.
      </p>
    </div>
  );
}

function DropZone({ onUpload }: { onUpload: (file: File) => void }) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <div
      className={`drop-zone p-8 sm:p-12 text-center cursor-pointer ${dragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onUpload(file);
      }}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input" type="file" accept=".xlsx,.xls,.csv" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }}
      />
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: 'rgba(127,85,57,0.12)', border: '1px solid rgba(127,85,57,0.25)' }}>
        <FileSpreadsheet size={28} className="text-[var(--mahogany)]" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold mb-2" style={{ color: 'var(--dark-brown)' }}>Drop your outstanding Excel or CSV here</h3>
      <p className="text-[13px] sm:text-sm mb-1" style={{ color: 'var(--walnut)' }}>
        Columns are detected automatically: Party, Bill No., Date, Due Amount, Mobile, Agent, City
      </p>
      <p className="text-[12px] mb-4" style={{ color: 'var(--walnut)' }}>Supports .xlsx, .xls, .csv: up to 50MB</p>
      <button className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #5C3D2E, #7F5539)', color: '#F5ECD7' }}>
        Browse Files
      </button>
    </div>
  );
}

function ResultSummary({ result, onReset }: { result: any; onReset: () => void }) {
  const successRate = result.records_total > 0
    ? Math.round((result.records_imported / result.records_total) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <CheckCircle size={18} className="text-[var(--recovery-green)]" />
        <p className="text-sm font-semibold" style={{ color: 'var(--dark-brown)' }}>Import complete</p>
        <button onClick={onReset} className="ml-auto px-4 py-2 rounded-lg text-sm border transition-all hover:bg-[rgba(127,85,57,0.06)]"
          style={{ color: 'var(--walnut)', borderColor: 'rgba(176,137,104,0.35)' }}>
          Import another file
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Rows', value: result.records_total, color: '#7F5539' },
          { label: 'Imported', value: result.records_imported, color: '#4A7C59' },
          { label: 'Failed', value: result.records_failed, color: '#C62828' },
          { label: 'Success Rate', value: `${successRate}%`, color: '#9C6644' },
        ].map((m) => (
          <div key={m.label} className="glass-card p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">{m.label}</p>
            <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Customers Created', value: result.customers_created },
          { label: 'Customers Updated', value: result.customers_updated },
          { label: 'Invoices Created', value: result.invoices_created },
        ].map((m) => (
          <div key={m.label} className="glass-card p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">{m.label}</p>
            <p className="text-xl font-bold" style={{ color: 'var(--dark-brown)' }}>{m.value}</p>
          </div>
        ))}
      </div>

      {result.errors?.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <AlertCircle size={14} className="text-red-400" />
            <span className="text-sm font-medium" style={{ color: 'var(--dark-brown)' }}>Failed Rows ({result.errors.length})</span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <table className="data-table w-full">
              <thead><tr><th>Row</th><th>Field</th><th>Error</th></tr></thead>
              <tbody>
                {result.errors.slice(0, 20).map((e: any, i: number) => (
                  <tr key={i}>
                    <td className="text-xs text-slate-400">#{e.row}</td>
                    <td className="text-xs text-[var(--rust)]">{e.field}</td>
                    <td className="text-xs text-red-400">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/dashboard/customers"
          className="flex-1 py-3 rounded-xl text-center font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, var(--walnut), var(--mahogany))' }}>
          View Customers →
        </Link>
        <Link href="/dashboard/outstandings"
          className="flex-1 py-3 rounded-xl text-center font-semibold border transition-all hover:bg-[rgba(127,85,57,0.06)]"
          style={{ color: 'var(--walnut)', borderColor: 'rgba(176,137,104,0.35)' }}>
          View Outstandings →
        </Link>
      </div>
    </div>
  );
}

export default function ImportPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: historyData } = useImportHistory();
  const uploadMutation = useUploadImport();
  const executeMutation = useExecuteImport();

  // Crawl the bar toward a ceiling while a request is in flight: real
  // milestones (upload done, import done) jump it forward.
  const crawlTo = (ceiling: number) => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      setProgress((p) => (p < ceiling ? p + Math.max(0.3, (ceiling - p) * 0.03) : p));
    }, 200);
  };
  const stopCrawl = () => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = null;
  };
  useEffect(() => () => stopCrawl(), []);

  async function handleUpload(file: File) {
    setPhase('running');
    setProgress(3);
    setImportResult(null);
    crawlTo(28);

    try {
      // 1. Upload + auto-detect columns
      const res = await uploadMutation.mutateAsync(file);
      const data = res.data.data;
      setProgress(32);
      crawlTo(92);

      const mappings: ColumnMapping[] = (data.suggested_mappings ?? []).map((s: any) => ({
        target_field: s.target_field,
        source_column: s.source_column,
      }));

      // 2. Import immediately with the detected columns (the backend
      // rejects with a clear message if Party / Bill No. weren't found)
      const exec = await executeMutation.mutateAsync({ history_id: data.history_id, mappings });
      const result = exec.data.data;

      stopCrawl();
      setProgress(100);
      setImportResult(result);
      setTimeout(() => setPhase('done'), 400);

      toast.success(`Done: ${result.records_imported} rows imported from ${file.name}`, {
        description: `${result.customers_created} new customers, ${result.invoices_created} new invoices, ${result.invoices_updated ?? 0} updated`,
        duration: 8000,
      });
    } catch (err: any) {
      stopCrawl();
      setPhase('idle');
      setProgress(0);
      toast.error('Import failed', { description: err.message, duration: 10000 });
    }
  }

  return (
    <div>
      <TopHeader title="Import Center" subtitle="Drop your outstanding file: everything else is automatic" />

      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm" style={{ color: 'var(--walnut)' }}>
            Each upload is treated as your latest outstanding report: new bills are added,
            changed dues updated, and missing bills marked as paid.
          </p>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-all hover:bg-[rgba(127,85,57,0.06)]"
            style={{ color: 'var(--walnut)', borderColor: 'rgba(176,137,104,0.35)' }}
          >
            <History size={13} /> History
          </button>
        </div>

        {showHistory && (
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--dark-brown)' }}>Import History</h3>
            </div>
            <div className="overflow-x-auto">
            <table className="data-table w-full min-w-[560px]">
              <thead><tr><th>File</th><th>Date</th><th>Total</th><th>Imported</th><th>Failed</th><th>Status</th></tr></thead>
              <tbody>
                {(historyData?.data ?? []).slice(0, 10).map((h: any) => (
                  <tr key={h.id}>
                    <td className="text-xs text-[var(--mahogany)] font-mono">{h.file_name}</td>
                    <td className="text-xs text-slate-400">{formatDate(h.created_at)}</td>
                    <td className="text-xs" style={{ color: 'var(--dark-brown)' }}>{h.records_total}</td>
                    <td className="text-xs text-[var(--recovery-green)]">{h.records_imported}</td>
                    <td className="text-xs text-red-400">{h.records_failed}</td>
                    <td><StatusBadge status={h.status} /></td>
                  </tr>
                ))}
                {(historyData?.data ?? []).length === 0 && (
                  <tr><td colSpan={6} className="text-center py-6 text-slate-500 text-sm">No imports yet</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}

        <div className="glass-card p-4 sm:p-6">
          {phase === 'idle' && <DropZone onUpload={handleUpload} />}
          {phase === 'running' && <ProgressBar progress={progress} />}
          {phase === 'done' && importResult && (
            <ResultSummary result={importResult} onReset={() => { setPhase('idle'); setProgress(0); setImportResult(null); }} />
          )}
        </div>
      </div>
    </div>
  );
}
