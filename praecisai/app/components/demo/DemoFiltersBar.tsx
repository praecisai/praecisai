'use client';

import { Search } from 'lucide-react';
import { Select } from '@/components/ui/Select';

const SEGMENT_OPTIONS = [
  'All Segments', 'Soft Reminder', 'Follow-up', 'Strong Follow-up', 'Escalation',
].map((s) => ({ value: s, label: s }));

interface DemoFiltersBarProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  segmentFilter: string;
  setSegmentFilter: (val: string) => void;
}

export default function DemoFiltersBar({
  searchQuery, setSearchQuery, segmentFilter, setSegmentFilter
}: DemoFiltersBarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--caramel)] bg-[var(--surface-warm)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--walnut)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search party name or bill..."
            className="input-dark w-full text-[13px]"
            style={{ paddingLeft: '32px' }}
          />
        </div>

        {/* Segment dropdown — uses default input-dark styled Select */}
        <Select
          className="flex-1 min-w-[160px] sm:flex-none sm:w-48"
          value={segmentFilter}
          onChange={setSegmentFilter}
          options={SEGMENT_OPTIONS}
        />
      </div>

      {(searchQuery || segmentFilter !== 'All Segments') && (
        <button
          onClick={() => { setSearchQuery(''); setSegmentFilter('All Segments'); }}
          className="text-[13px] font-medium transition-colors hover:opacity-75"
          style={{ color: 'var(--walnut)' }}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
