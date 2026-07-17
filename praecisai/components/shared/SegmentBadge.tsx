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
    ACTIVE:     'bg-emerald-50  text-emerald-700 border border-emerald-200  dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/25',
    PENDING:    'bg-amber-50    text-amber-700   border border-amber-200    dark:bg-amber-500/15   dark:text-amber-400   dark:border-amber-500/25',
    COMPLETED:  'bg-blue-50     text-blue-700    border border-blue-200     dark:bg-blue-500/15    dark:text-blue-400    dark:border-blue-500/25',
    FAILED:     'bg-red-50      text-red-700     border border-red-200      dark:bg-red-500/15     dark:text-red-400     dark:border-red-500/25',
    PROCESSING: 'bg-violet-50   text-violet-700  border border-violet-200   dark:bg-violet-500/15  dark:text-violet-400  dark:border-violet-500/25',
    CLEARED:    'bg-emerald-50  text-emerald-700 border border-emerald-200  dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/25',
    OVERDUE:    'bg-red-50      text-red-700     border border-red-200      dark:bg-red-500/15     dark:text-red-400     dark:border-red-500/25',
    PAID:       'bg-emerald-50  text-emerald-700 border border-emerald-200  dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/25',
    PARTIAL:    'bg-amber-50    text-amber-700   border border-amber-200    dark:bg-amber-500/15   dark:text-amber-400   dark:border-amber-500/25',
    DISPUTED:   'bg-orange-50   text-orange-700  border border-orange-200   dark:bg-orange-500/15  dark:text-orange-400  dark:border-orange-500/25',
    DRAFT:      'bg-slate-100   text-slate-600   border border-slate-200    dark:bg-slate-500/15   dark:text-slate-400   dark:border-slate-500/25',
    RUNNING:    'bg-blue-50     text-blue-700    border border-blue-200     dark:bg-blue-500/15    dark:text-blue-400    dark:border-blue-500/25',
    SCHEDULED:  'bg-violet-50   text-violet-700  border border-violet-200   dark:bg-violet-500/15  dark:text-violet-400  dark:border-violet-500/25',
    SUSPENDED:  'bg-red-50      text-red-700     border border-red-200      dark:bg-red-500/15     dark:text-red-400     dark:border-red-500/25',
    INACTIVE:   'bg-slate-100   text-slate-600   border border-slate-200    dark:bg-slate-500/15   dark:text-slate-400   dark:border-slate-500/25',
    BOUNCED:    'bg-red-50      text-red-700     border border-red-200      dark:bg-red-500/15     dark:text-red-400     dark:border-red-500/25',
    CREDIT:     'bg-purple-50   text-purple-700  border border-purple-200   dark:bg-purple-500/15  dark:text-purple-400  dark:border-purple-500/25',
  };

  const cls = colorMap[status] ?? 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-500/15 dark:text-slate-400 dark:border-slate-500/25';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>
      {status}
    </span>
  );
}
