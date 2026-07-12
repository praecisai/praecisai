import type { Segment } from '../../types';
import { getSegmentClass } from '../../lib/utils/format';

export function SegmentBadge({ segment }: { segment: string }) {
  const cls = getSegmentClass(segment as Segment);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap badge-${cls}`}>
      {segment}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    PENDING: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    COMPLETED: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    FAILED: 'bg-red-500/10 text-red-400 border border-red-500/20',
    PROCESSING: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    CLEARED: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    OVERDUE: 'bg-red-500/10 text-red-400 border border-red-500/20',
    PAID: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    DRAFT: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
    RUNNING: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    SCHEDULED: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    SUSPENDED: 'bg-red-500/10 text-red-400 border border-red-500/20',
    INACTIVE: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  };

  const cls = colorMap[status] ?? 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>
      {status}
    </span>
  );
}
