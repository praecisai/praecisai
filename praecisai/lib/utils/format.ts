import type { Segment } from '../../types';

/**
 * Format a number as Indian Rupee currency string
 */
export function formatINR(amount: number): string {
  if (amount === 0) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number with Indian locale commas
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

/**
 * Format date string to DD MMM YYYY
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Format relative time (e.g. "2 hours ago")
 */
export function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(dateStr);
}

/**
 * Get CSS class suffix for a segment
 */
export function getSegmentClass(segment: Segment | string): string {
  const map: Record<string, string> = {
    'No Follow-up': 'nofollowup',
    'Soft Reminder': 'soft',
    'Follow-up': 'followup',
    'Strong Follow-up': 'strong',
    'Escalation': 'escalation',
    'Cleared': 'cleared',
    'Credit Note': 'credit',
  };
  return map[segment] ?? 'soft';
}

/**
 * Get a color for aging bucket charts
 */
export function getAgingColor(bucket: string): string {
  const map: Record<string, string> = {
    '0-60': '#3b82f6',
    '61-120': '#f59e0b',
    '121-180': '#f97316',
    '181+': '#ef4444',
  };
  return map[bucket] ?? '#6b7280';
}

/**
 * Truncate string to max length
 */
export function truncate(str: string, max = 30): string {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

/**
 * Clamp a number between min and max
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
