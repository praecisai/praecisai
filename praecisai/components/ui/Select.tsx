'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';

export type SelectOption = { value: string; label: string };

// Themed replacement for native <select>: the OS option popup can't be
// styled, so filter dropdowns use this to match the warm palette.
// The menu renders in a body portal: cards use backdrop-filter/overflow-hidden
// which would otherwise trap or clip an absolutely-positioned menu.
export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  className = '',
  buttonClassName,
  searchable,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  // Shows a filter box at the top of the menu. Defaults on for long lists
  // (many agents/cities); pass false to force it off.
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<
    { top: number | null; bottom: number | null; left: number; width: number; maxHeight: number } | null
  >(null);
  const [query, setQuery] = useState('');
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const showSearch = searchable ?? options.length > 10;
  const visibleOptions = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Phones and short landscape viewports leave very little room below a
  // trigger near the fold: flip the menu above when that side is roomier and
  // cap its height so the options always stay reachable.
  const updatePos = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const gap = 6;
    const margin = 8;
    const below = window.innerHeight - r.bottom - gap - margin;
    const above = r.top - gap - margin;
    const flip = below < 180 && above > below;
    setPos({
      top: flip ? null : r.bottom + gap,
      bottom: flip ? window.innerHeight - r.top + gap : null,
      left: r.left,
      width: r.width,
      maxHeight: Math.max(140, flip ? above : below),
    });
  };

  useEffect(() => {
    if (!open) return;
    setQuery('');
    updatePos();
    // Focus the filter box once the portal mounts
    setTimeout(() => searchRef.current?.focus(), 0);
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onMove = () => updatePos();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open]);

  // Keep the menu inside the viewport if it's wider than the trigger
  useEffect(() => {
    if (!open || !menuRef.current || !pos) return;
    const spill = pos.left + menuRef.current.offsetWidth - (window.innerWidth - 8);
    if (spill > 0) setPos((p) => (p ? { ...p, left: Math.max(8, p.left - spill) } : p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pos?.left]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={
          buttonClassName ??
          'input-dark flex w-full cursor-pointer items-center justify-between gap-2 text-left text-sm'
        }
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 text-[var(--walnut)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.75}
        />
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[100] w-max rounded-xl border p-1.5"
          style={{
            ...(pos.top !== null ? { top: pos.top } : {}),
            ...(pos.bottom !== null ? { bottom: pos.bottom } : {}),
            left: pos.left,
            minWidth: pos.width,
            maxWidth: 'calc(100vw - 16px)',
            background: 'var(--surface-warm)',
            borderColor: 'var(--caramel)',
            boxShadow: '0 8px 24px rgba(127,85,57,0.18)',
          }}
        >
          {/* Search sits outside the scroll area so options never slide behind it */}
          {showSearch && (
            <div className="pb-1.5">
              <div
                className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
                style={{ borderColor: 'rgba(176,137,104,0.4)', background: 'var(--sand)' }}
              >
                <Search size={12} className="flex-shrink-0" style={{ color: 'var(--walnut)' }} />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  placeholder="Type to filter…"
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter picks the first visible option
                    if (e.key === 'Enter' && visibleOptions.length > 0) {
                      onChange(visibleOptions[0].value);
                      setOpen(false);
                    }
                  }}
                  className="bg-transparent border-none outline-none text-xs w-full"
                  style={{ color: 'var(--dark-brown)' }}
                />
              </div>
            </div>
          )}
          <ul
            role="listbox"
            className="overflow-y-auto"
            style={{
              // Short lists (e.g. segments) render in full: the cap is whichever
              // is smaller of the usual 16rem limit for long lists and the space
              // actually left on screen below (or above) the trigger.
              maxHeight: Math.min(
                options.length > 8 ? 256 : Infinity,
                pos.maxHeight - (showSearch ? 46 : 0) - 12,
              ),
            }}
          >
            {visibleOptions.length === 0 && (
              <li className="px-3 py-2 text-xs" style={{ color: 'var(--walnut)' }}>No matches</li>
            )}
            {visibleOptions.map((o) => {
              const isSelected = o.value === value;
              return (
                <li key={o.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-[var(--sand)] font-semibold text-[var(--mahogany)]'
                        : 'text-[var(--dark-brown)] hover:bg-[var(--sand)] hover:text-[var(--mahogany)]'
                    }`}
                  >
                    {o.label}
                    {isSelected && <Check size={13} className="flex-shrink-0 text-[var(--mahogany)]" strokeWidth={2} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}
