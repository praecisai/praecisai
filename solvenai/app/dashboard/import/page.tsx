'use client';

import { useState, useCallback } from 'react';
import { TopHeader } from '../../../components/layout/Sidebar';
import { useUploadImport, usePreviewImport, useExecuteImport, useImportTemplates, useSaveTemplate, useImportHistory } from '../../../lib/api/hooks';
import { formatDate, formatINR } from '../../../lib/utils/format';
import { StatusBadge } from '../../../components/shared/SegmentBadge';
import {
  Upload, ChevronRight, CheckCircle, AlertCircle, X, Save, Eye,
  Loader2, FileSpreadsheet, ArrowRight, History,
} from 'lucide-react';
import Link from 'next/link';
import type { ColumnMapping, TargetField } from '../../../types';

// ─── Target field labels ───────────────────────────────────────────────────────
const TARGET_FIELDS: { field: TargetField; label: string; required: boolean }[] = [
  { field: 'customer_name', label: 'Customer Name', required: true },
  { field: 'invoice_number', label: 'Invoice Number', required: true },
  { field: 'invoice_date', label: 'Invoice Date', required: false },
  { field: 'due_amount', label: 'Due Amount (₹)', required: false },
  { field: 'days_overdue', label: 'Days Overdue', required: false },
  { field: 'phone', label: 'Mobile Number', required: false },
  { field: 'city', label: 'City', required: false },
  { field: 'sales_agent', label: 'Sales Agent', required: false },
  { field: 'call_status', label: 'Call Status', required: false },
];

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < current ? 'bg-emerald-500 text-white' :
              i === current ? 'bg-blue-500 text-white' :
              'bg-white/5 text-slate-500'
            }`}>
              {i < current ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === current ? 'text-white' : i < current ? 'text-emerald-400' : 'text-slate-500'}`}>
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-px mx-2 ${i < current ? 'bg-emerald-500' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Drop Zone ────────────────────────────────────────────────────────
function DropZoneStep({ onUpload }: { onUpload: (file: File) => void }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  }, [onUpload]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div
      className={`drop-zone p-12 text-center cursor-pointer ${dragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input id="file-input" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileInput} />
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
        <FileSpreadsheet size={28} className="text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Drop your Excel or CSV file here</h3>
      <p className="text-sm text-slate-400 mb-4">Supports .xlsx, .xls, .csv — up to 50MB</p>
      <button className="px-5 py-2.5 rounded-lg text-sm font-medium text-white"
        style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
        Browse Files
      </button>
    </div>
  );
}

// ─── Step 2: Column Mapper ────────────────────────────────────────────────────
function ColumnMapperStep({
  headers, suggested, templates, onMappingChange, onSaveTemplate, mappings,
}: {
  headers: string[];
  suggested: { target_field: TargetField; source_column: string; confidence: number }[];
  templates: any[];
  mappings: ColumnMapping[];
  onMappingChange: (field: TargetField, column: string) => void;
  onSaveTemplate: (name: string) => void;
}) {
  const [templateName, setTemplateName] = useState('');
  const [showSave, setShowSave] = useState(false);

  const getMappedColumn = (field: TargetField) =>
    mappings.find((m) => m.target_field === field)?.source_column ?? '';

  const getSuggestionConfidence = (field: TargetField) =>
    suggested.find((s) => s.target_field === field)?.confidence ?? 0;

  return (
    <div className="space-y-4">
      {/* Template loader */}
      {templates.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <span className="text-sm text-slate-400">Load saved template:</span>
          <select className="input-dark text-sm flex-1" style={{ maxWidth: 220 }}
            onChange={(e) => {
              if (!e.target.value) return;
              const t = templates.find((t) => t.id === e.target.value);
              if (t) {
                (t.mappings as ColumnMapping[]).forEach((m) => onMappingChange(m.target_field, m.source_column));
              }
            }}>
            <option value="">Select template…</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      {/* Mapping rows */}
      <div className="space-y-2">
        {TARGET_FIELDS.map(({ field, label, required }) => {
          const mapped = getMappedColumn(field);
          const conf = getSuggestionConfidence(field);

          return (
            <div key={field} className="flex items-center gap-4 p-3 rounded-lg glass-card">
              <div className="w-40 flex-shrink-0">
                <p className="text-sm font-medium text-white">
                  {label}
                  {required && <span className="text-red-400 ml-1">*</span>}
                </p>
                {conf > 0 && mapped && (
                  <p className="text-[10px] text-emerald-400 mt-0.5">
                    {Math.round(conf * 100)}% match
                  </p>
                )}
              </div>
              <ArrowRight size={14} className="text-slate-600 flex-shrink-0" />
              <select
                className={`input-dark text-sm flex-1 ${mapped ? 'border-emerald-500/30 text-emerald-300' : ''}`}
                value={mapped}
                onChange={(e) => onMappingChange(field, e.target.value)}
              >
                <option value="">— Not mapped —</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
              {mapped && (
                <div className="w-5 flex-shrink-0">
                  <CheckCircle size={16} className="text-emerald-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save template */}
      <div className="flex items-center gap-3">
        {showSave ? (
          <>
            <input type="text" placeholder="Template name…" value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="input-dark text-sm flex-1" style={{ maxWidth: 220 }} />
            <button
              onClick={() => { if (templateName) { onSaveTemplate(templateName); setShowSave(false); setTemplateName(''); } }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
              <Save size={13} className="inline mr-1" /> Save
            </button>
            <button onClick={() => setShowSave(false)} className="p-2 text-slate-500 hover:text-white">
              <X size={14} />
            </button>
          </>
        ) : (
          <button onClick={() => setShowSave(true)}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all">
            <Save size={13} /> Save as template
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Preview ──────────────────────────────────────────────────────────
function PreviewStep({ previewData }: { previewData: any }) {
  if (!previewData) return <div className="text-slate-400 text-center py-8">No preview data</div>;

  const { preview = [], validation_errors = [], total_rows = 0 } = previewData;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Showing first <strong className="text-white">5</strong> of <strong className="text-white">{total_rows}</strong> rows
        </p>
        {validation_errors.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-yellow-400">
            <AlertCircle size={14} />
            {validation_errors.length} validation warnings
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="text-left">#</th>
              {TARGET_FIELDS.slice(0, 7).map((f) => (
                <th key={f.field} className="text-left">{f.label}</th>
              ))}
              <th className="text-left">Errors</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((row: any) => (
              <tr key={row.row_index} className={row.errors?.length ? 'bg-red-500/5' : ''}>
                <td className="text-xs text-slate-500">{row.row_index}</td>
                {TARGET_FIELDS.slice(0, 7).map((f) => (
                  <td key={f.field} className="text-xs">
                    {row.mapped[f.field]
                      ? <span className="text-white">{String(row.mapped[f.field]).slice(0, 25)}</span>
                      : <span className="text-slate-600">—</span>}
                  </td>
                ))}
                <td>
                  {row.errors?.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {row.errors.map((e: any, i: number) => (
                        <span key={i} className="text-[10px] text-red-400">{e.field}: {e.message}</span>
                      ))}
                    </div>
                  ) : <CheckCircle size={13} className="text-emerald-400" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Step 4: Import Progress ──────────────────────────────────────────────────
function ImportProgressStep({ result, isRunning }: { result: any; isRunning: boolean }) {
  if (isRunning) {
    return (
      <div className="text-center py-12">
        <Loader2 size={40} className="text-blue-400 animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Importing data…</h3>
        <p className="text-sm text-slate-400">Processing rows, upserting customers, recalculating segments</p>
      </div>
    );
  }

  if (!result) return null;

  const successRate = result.records_total > 0
    ? Math.round((result.records_imported / result.records_total) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Rows', value: result.records_total, color: '#60a5fa' },
          { label: 'Imported', value: result.records_imported, color: '#34d399' },
          { label: 'Failed', value: result.records_failed, color: '#f87171' },
          { label: 'Success Rate', value: `${successRate}%`, color: '#a78bfa' },
        ].map((m) => (
          <div key={m.label} className="glass-card p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">{m.label}</p>
            <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Details */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Customers Created', value: result.customers_created },
          { label: 'Customers Updated', value: result.customers_updated },
          { label: 'Invoices Created', value: result.invoices_created },
        ].map((m) => (
          <div key={m.label} className="glass-card p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">{m.label}</p>
            <p className="text-xl font-bold text-white">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Error list */}
      {result.errors?.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <AlertCircle size={14} className="text-red-400" />
            <span className="text-sm font-medium text-white">Failed Rows ({result.errors.length})</span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <table className="data-table w-full">
              <thead><tr><th>Row</th><th>Field</th><th>Error</th></tr></thead>
              <tbody>
                {result.errors.slice(0, 20).map((e: any, i: number) => (
                  <tr key={i}>
                    <td className="text-xs text-slate-400">#{e.row}</td>
                    <td className="text-xs text-yellow-400">{e.field}</td>
                    <td className="text-xs text-red-400">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/dashboard/customers"
          className="flex-1 py-3 rounded-xl text-center font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
          View Customers →
        </Link>
        <Link href="/dashboard/outstandings"
          className="flex-1 py-3 rounded-xl text-center font-semibold text-white border border-white/10 hover:bg-white/5 transition-all text-slate-300">
          View Outstandings →
        </Link>
      </div>
    </div>
  );
}

// ─── Main Import Page ─────────────────────────────────────────────────────────
const STEPS = ['Upload', 'Map Columns', 'Preview', 'Import', 'Done'];

export default function ImportPage() {
  const [step, setStep] = useState(0);
  const [uploadData, setUploadData] = useState<any>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { data: templates = [] } = useImportTemplates();
  const { data: historyData } = useImportHistory();
  const uploadMutation = useUploadImport();
  const previewMutation = usePreviewImport();
  const executeMutation = useExecuteImport();
  const saveTemplateMutation = useSaveTemplate();

  async function handleUpload(file: File) {
    try {
      const res = await uploadMutation.mutateAsync(file);
      const data = res.data.data;
      setUploadData(data);

      // Apply suggested mappings
      const suggested: ColumnMapping[] = (data.suggested_mappings ?? []).map((s: any) => ({
        target_field: s.target_field,
        source_column: s.source_column,
        confidence: s.confidence,
      }));
      setMappings(suggested);
      setStep(1);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    }
  }

  function handleMappingChange(field: TargetField, column: string) {
    setMappings((prev) => {
      const existing = prev.findIndex((m) => m.target_field === field);
      if (column === '') {
        return prev.filter((m) => m.target_field !== field);
      }
      if (existing >= 0) {
        return prev.map((m, i) => i === existing ? { ...m, source_column: column } : m);
      }
      return [...prev, { target_field: field, source_column: column }];
    });
  }

  async function handlePreview() {
    try {
      const res = await previewMutation.mutateAsync({ history_id: uploadData.history_id, mappings });
      setPreviewData(res.data.data);
      setStep(2);
    } catch (err: any) {
      alert(`Preview failed: ${err.message}`);
    }
  }

  async function handleExecute() {
    setStep(3);
    try {
      const res = await executeMutation.mutateAsync({ history_id: uploadData.history_id, mappings });
      setImportResult(res.data.data);
      setStep(4);
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
      setStep(2);
    }
  }

  async function handleSaveTemplate(name: string) {
    try {
      await saveTemplateMutation.mutateAsync({ name, mappings });
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  }

  function reset() {
    setStep(0);
    setUploadData(null);
    setMappings([]);
    setPreviewData(null);
    setImportResult(null);
  }

  return (
    <div>
      <TopHeader title="Import Center" subtitle="Upload and process your outstanding data" />

      <div className="p-6 space-y-5">
        {/* Header actions */}
        <div className="flex items-center justify-between">
          <StepIndicator current={step} steps={STEPS} />
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all"
          >
            <History size={13} /> History
          </button>
        </div>

        {/* History panel */}
        {showHistory && (
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white">Import History</h3>
            </div>
            <table className="data-table w-full">
              <thead><tr><th>File</th><th>Date</th><th>Total</th><th>Imported</th><th>Failed</th><th>Status</th></tr></thead>
              <tbody>
                {(historyData?.data ?? []).slice(0, 10).map((h: any) => (
                  <tr key={h.id}>
                    <td className="text-xs text-blue-400 font-mono">{h.file_name}</td>
                    <td className="text-xs text-slate-400">{formatDate(h.created_at)}</td>
                    <td className="text-xs text-white">{h.records_total}</td>
                    <td className="text-xs text-emerald-400">{h.records_imported}</td>
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
        )}

        {/* Step content */}
        <div className="glass-card p-6">
          {step === 0 && (
            <div>
              <h2 className="text-base font-semibold text-white mb-1">Step 1: Upload File</h2>
              <p className="text-sm text-slate-400 mb-5">Upload your Excel or CSV file with outstanding dues data</p>
              {uploadMutation.isPending ? (
                <div className="text-center py-12">
                  <Loader2 size={36} className="text-blue-400 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-slate-400">Uploading and extracting headers…</p>
                </div>
              ) : (
                <DropZoneStep onUpload={handleUpload} />
              )}
            </div>
          )}

          {step === 1 && uploadData && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-white">Step 2: Map Columns</h2>
                  <p className="text-sm text-slate-400 mt-0.5">
                    <span className="text-blue-400 font-mono text-xs">{uploadData.file_name}</span>
                    {' '}· {uploadData.row_count} rows · {uploadData.headers.length} columns detected
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep(0)} className="px-3 py-2 rounded-lg text-sm text-slate-400 border border-white/10 hover:bg-white/5 transition-all">
                    ← Back
                  </button>
                  <button
                    onClick={handlePreview}
                    disabled={previewMutation.isPending}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 flex items-center gap-1.5"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
                  >
                    {previewMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
                    Preview
                  </button>
                </div>
              </div>
              <ColumnMapperStep
                headers={uploadData.headers}
                suggested={uploadData.suggested_mappings ?? []}
                templates={templates}
                mappings={mappings}
                onMappingChange={handleMappingChange}
                onSaveTemplate={handleSaveTemplate}
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-white">Step 3: Preview</h2>
                  <p className="text-sm text-slate-400 mt-0.5">Review first 5 rows with your column mapping applied</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep(1)} className="px-3 py-2 rounded-lg text-sm text-slate-400 border border-white/10 hover:bg-white/5 transition-all">← Back</button>
                  <button
                    onClick={handleExecute}
                    className="px-5 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-1.5"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                  >
                    <Upload size={13} /> Run Import
                  </button>
                </div>
              </div>
              <PreviewStep previewData={previewData} />
            </div>
          )}

          {(step === 3 || step === 4) && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    {step === 3 ? 'Step 4: Importing…' : 'Step 5: Done!'}
                  </h2>
                </div>
                {step === 4 && (
                  <button onClick={reset} className="px-4 py-2 rounded-lg text-sm text-slate-400 border border-white/10 hover:bg-white/5 transition-all">
                    New Import
                  </button>
                )}
              </div>
              <ImportProgressStep result={importResult} isRunning={executeMutation.isPending} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
