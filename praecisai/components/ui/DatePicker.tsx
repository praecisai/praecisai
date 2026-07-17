'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

// Themed replacement for <input type="date"> : the native calendar popup
// cannot be styled, so filters use this to match the warm palette.
// Value format is 'YYYY-MM-DD' (same as the native input), '' = empty.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fromKey(v: string): Date | null {
  const m = v?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'dd/mm/yyyy',
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const selected = fromKey(value);
  const today = new Date();
  const [viewYear, setViewYear] = useState((selected ?? today).getFullYear());
  const [viewMonth, setViewMonth] = useState((selected ?? today).getMonth());
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePos = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, left: r.left });
  };

  useEffect(() => {
    if (!open) return;
    const d = fromKey(value);
    if (d) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
    updatePos();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the calendar inside the viewport
  useEffect(() => {
    if (!open || !menuRef.current || !pos) return;
    const spill = pos.left + menuRef.current.offsetWidth - (window.innerWidth - 8);
    if (spill > 0) setPos((p) => (p ? { ...p, left: Math.max(8, p.left - spill) } : p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pos?.left]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  // 6 rows of 7 days covering the viewed month
  const first = new Date(viewYear, viewMonth, 1);
  const gridStart = new Date(viewYear, viewMonth, 1 - first.getDay());
  const days: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const label = selected
    ? `${String(selected.getDate()).padStart(2, '0')}/${String(selected.getMonth() + 1).padStart(2, '0')}/${selected.getFullYear()}`
    : placeholder;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input-dark flex w-full cursor-pointer items-center justify-between gap-2 text-left text-sm"
      >
        <span className={selected ? '' : 'opacity-60'} style={{ color: 'var(--dark-brown)' }}>{label}</span>
        <Calendar size={13} className="flex-shrink-0 text-[var(--walnut)]" strokeWidth={1.75} />
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[100] rounded-xl border p-3"
          style={{
            top: pos.top,
            left: pos.left,
            width: 252,
            background: 'var(--surface-warm)',
            borderColor: 'var(--caramel)',
            boxShadow: '0 8px 24px rgba(127,85,57,0.18)',
          }}
        >
          {/* Month header */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth}
              className="p-1 rounded-md transition-colors hover:bg-[var(--sand)]"
              style={{ color: 'var(--walnut)' }}>
              <ChevronLeft size={15} />
            </button>
            <p className="text-sm font-semibold" style={{ color: 'var(--dark-brown)' }}>
              {MONTHS[viewMonth]} {viewYear}
            </p>
            <button type="button" onClick={nextMonth}
              className="p-1 rounded-md transition-colors hover:bg-[var(--sand)]"
              style={{ color: 'var(--walnut)' }}>
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Weekday row */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w) => (
              <span key={w} className="text-center text-[10px] font-semibold uppercase py-1" style={{ color: 'var(--walnut)' }}>{w}</span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d) => {
              const inMonth = d.getMonth() === viewMonth;
              const isSelected = selected && toKey(d) === toKey(selected);
              const isToday = toKey(d) === toKey(today);
              return (
                <button
                  key={toKey(d)}
                  type="button"
                  onClick={() => { onChange(toKey(d)); setOpen(false); }}
                  className="h-7 w-7 mx-auto rounded-md text-xs flex items-center justify-center transition-colors hover:bg-[var(--sand)]"
                  style={
                    isSelected
                      ? { background: 'linear-gradient(135deg, var(--walnut), var(--mahogany))', color: '#FFFDF9', fontWeight: 600 }
                      : {
                          color: inMonth ? 'var(--dark-brown)' : 'rgba(176,137,104,0.45)',
                          ...(isToday ? { border: '1px solid var(--mahogany)' } : {}),
                        }
                  }
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: 'rgba(221,184,146,0.4)' }}>
            <button type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="text-xs font-medium px-2 py-1 rounded-md transition-colors hover:bg-[var(--sand)]"
              style={{ color: 'var(--walnut)' }}>
              Clear
            </button>
            <button type="button"
              onClick={() => { onChange(toKey(today)); setOpen(false); }}
              className="text-xs font-semibold px-2 py-1 rounded-md transition-colors hover:bg-[var(--sand)]"
              style={{ color: 'var(--mahogany)' }}>
              Today
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
