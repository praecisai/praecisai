'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Check, ChevronsUpDown, CornerUpLeft, Search } from 'lucide-react';
import { useSwitchableBusinesses } from '../../lib/api/hooks';
import { ACT_AS_BUSINESS_KEY } from '../../lib/api/client';

/**
 * Platform owners only (the Sidebar renders this when access.reason is
 * OWNER): open any business's dashboard. The choice is kept in localStorage
 * and sent as x-praecis-business on every API call; a full reload makes sure
 * nothing from the previous business stays on screen.
 */
export function BusinessSwitcher({
  currentId,
  currentName,
  acting,
}: {
  currentId: string;
  currentName: string;
  acting: boolean;
}) {
  const { data: businesses, isLoading } = useSwitchableBusinesses(true);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = businesses ?? [];
    if (!q) return all;
    return all.filter((b) => b.name.toLowerCase().includes(q) || (b.email ?? '').toLowerCase().includes(q));
  }, [businesses, query]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  function toggle() {
    if (!open) {
      setQuery('');
      setActive(0);
    }
    setOpen(!open);
  }

  // Keep the keyboard-highlighted row in view
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function choose(id: string | null) {
    try {
      if (!id) window.localStorage.removeItem(ACT_AS_BUSINESS_KEY);
      else window.localStorage.setItem(ACT_AS_BUSINESS_KEY, id);
    } catch {
      return;
    }
    if (id === currentId) {
      setOpen(false);
      return;
    }
    window.location.reload();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      choose(results[active].id);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--rust)]">Business</p>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{ background: 'var(--sand)', color: 'var(--mahogany)' }}
        >
          {acting ? 'Owner view' : 'Owner'}
        </span>
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="mt-1.5 w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors"
        style={{
          background: 'var(--surface-warm)',
          borderColor: acting ? 'var(--mahogany)' : 'var(--caramel)',
        }}
      >
        <Building2 size={15} className="flex-shrink-0 text-[var(--mahogany)]" />
        <span className="flex-1 min-w-0 text-sm font-semibold text-[var(--dark-brown)] truncate" title={currentName}>
          {currentName}
        </span>
        <ChevronsUpDown size={14} className="flex-shrink-0 text-[var(--walnut)]" />
      </button>

      {acting && (
        <button
          type="button"
          onClick={() => choose(null)}
          className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[var(--mahogany)] hover:underline underline-offset-2"
        >
          <CornerUpLeft size={11} /> Back to my own business
        </button>
      )}

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border shadow-xl overflow-hidden"
          style={{ background: 'var(--surface-warm)', borderColor: 'var(--caramel)' }}
          onKeyDown={onKeyDown}
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--caramel)' }}>
            <Search size={14} className="flex-shrink-0 text-[var(--walnut)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              placeholder="Search business or email"
              className="w-full bg-transparent text-sm text-[var(--dark-brown)] placeholder:text-[var(--walnut)] outline-none"
            />
          </div>

          <ul ref={listRef} role="listbox" className="max-h-80 overflow-y-auto py-1">
            {isLoading && <li className="px-3 py-2 text-xs text-[var(--walnut)]">Loading businesses…</li>}
            {!isLoading && results.length === 0 && (
              <li className="px-3 py-2 text-xs text-[var(--walnut)]">No business matches &ldquo;{query}&rdquo;</li>
            )}
            {results.map((b, i) => {
              const current = b.id === currentId;
              return (
                <li
                  key={b.id}
                  data-idx={i}
                  role="option"
                  aria-selected={current}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(b.id)}
                  className="mx-1 px-2.5 py-2 rounded-lg cursor-pointer flex items-start gap-2"
                  style={{ background: i === active ? 'var(--sand)' : 'transparent' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--dark-brown)] truncate" title={b.name}>
                      {b.name}
                    </p>
                    <p className="text-[11px] text-[var(--walnut)] truncate">
                      {[b.customers ? `${b.customers} customers` : 'No customers', b.email].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {current && <Check size={14} className="flex-shrink-0 mt-0.5 text-[var(--mahogany)]" />}
                </li>
              );
            })}
          </ul>

          {businesses && (
            <p className="px-3 py-1.5 text-[10px] text-[var(--walnut)] border-t" style={{ borderColor: 'var(--caramel)' }}>
              {results.length} of {businesses.length} businesses · only owner logins see this
            </p>
          )}
        </div>
      )}
    </div>
  );
}
