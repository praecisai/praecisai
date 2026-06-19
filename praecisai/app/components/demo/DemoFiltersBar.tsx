'use client';

import { Search, X } from 'lucide-react';

interface DemoFiltersBarProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  cityFilter: string;
  setCityFilter: (val: string) => void;
  segmentFilter: string;
  setSegmentFilter: (val: string) => void;
}

export default function DemoFiltersBar({
  searchQuery, setSearchQuery, cityFilter, setCityFilter, segmentFilter, setSegmentFilter
}: DemoFiltersBarProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--caramel)] bg-[var(--surface-warm)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--walnut)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search party name or bill..."
            className="w-full rounded-xl border border-[var(--caramel)] bg-[var(--cream)] pl-9 pr-4 py-2 font-body text-[13px] outline-none focus:border-[var(--mahogany)] focus:ring-1 focus:ring-[var(--mahogany)]"
          />
        </div>

        <select 
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="rounded-xl border border-[var(--caramel)] bg-[var(--cream)] px-4 py-2 font-body text-[13px] outline-none"
        >
          <option value="All Cities">All Cities</option>
          <option value="LUDHIANA">Ludhiana</option>
          <option value="JAUNPUR">Jaunpur</option>
          <option value="KOTA">Kota</option>
        </select>

        <select 
          value={segmentFilter}
          onChange={(e) => setSegmentFilter(e.target.value)}
          className="rounded-xl border border-[var(--caramel)] bg-[var(--cream)] px-4 py-2 font-body text-[13px] outline-none"
        >
          <option value="All Segments">All Segments</option>
          <option value="Soft Reminder">Soft Reminder</option>
          <option value="Follow-up">Follow-up</option>
          <option value="Strong Follow-up">Strong Follow-up</option>
          <option value="Escalation">Escalation</option>
        </select>
      </div>

      <button 
        onClick={() => {
          setSearchQuery('');
          setCityFilter('All Cities');
          setSegmentFilter('All Segments');
        }}
        className="flex items-center gap-1.5 whitespace-nowrap font-body text-[13px] font-medium text-[var(--walnut)] hover:text-[var(--dark-brown)]"
      >
        <X className="h-4 w-4" /> Clear filters
      </button>
    </div>
  );
}
