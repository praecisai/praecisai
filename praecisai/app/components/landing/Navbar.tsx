'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { IconMenu2, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils/cn';
import { Logo } from './Logo';

function scrollToDemo(e: React.MouseEvent) {
  e.preventDefault();
  const el = document.getElementById('demo');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', '#demo');
  }
}

const navLinks = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features',     href: '#features'    },
  { label: 'Reports',      href: '#reports'      },
  { label: 'Pricing',      href: '#pricing'      },
  { label: 'FAQ',          href: '#faq'          },
];

// ── Reusable sliding-pill hook ──────────────────────────────────────
function useSlidingPill<T extends HTMLElement>() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pill, setPill] = useState({ width: 0, left: 0 });
  const refs = useRef<Map<string, T>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const measure = (key: string) => {
    const el = refs.current.get(key);
    const container = containerRef.current;
    if (!el || !container) return;
    const r = el.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    setPill({ width: r.width, left: r.left - cr.left });
  };

  useLayoutEffect(() => {
    if (!hovered) return;
    const upd = () => measure(hovered);
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, [hovered]);

  return { hovered, setHovered, pill, refs, containerRef, measure };
}

// ── Nav links with sliding pill ─────────────────────────────────────
function NavTabs() {
  const { hovered, setHovered, pill, refs, containerRef, measure } =
    useSlidingPill<HTMLAnchorElement>();

  return (
    <div ref={containerRef} className="relative flex items-center">
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute z-0 rounded-full bg-[var(--mahogany)]"
            style={{ height: 'calc(100% - 4px)', top: '2px' }}
            initial={{ opacity: 0, width: pill.width, x: pill.left }}
            animate={{ opacity: 1, width: pill.width, x: pill.left }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          />
        )}
      </AnimatePresence>
      {navLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          ref={(el) => {
            if (el) refs.current.set(link.href, el);
            else refs.current.delete(link.href);
          }}
          onMouseEnter={() => { setHovered(link.href); measure(link.href); }}
          onMouseLeave={() => setHovered(null)}
          className={cn(
            'relative z-10 px-3.5 py-1.5 font-body text-[13px] font-medium whitespace-nowrap transition-colors duration-150',
            hovered === link.href
              ? 'text-[var(--cream)]'
              : 'text-[var(--mahogany)]/65 hover:text-[var(--mahogany)]',
          )}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

// ── Login + Try Demo with sliding pill ──────────────────────────────
function ActionLinks({ onScrollDemo }: { onScrollDemo: (e: React.MouseEvent) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pill, setPill] = useState({ width: 0, left: 0 });
  const loginRef  = useRef<HTMLAnchorElement>(null);
  const demoRef   = useRef<HTMLAnchorElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const measure = (key: string) => {
    const el = key === 'login' ? loginRef.current : demoRef.current;
    const container = containerRef.current;
    if (!el || !container) return;
    const r = el.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    setPill({ width: r.width, left: r.left - cr.left });
  };

  const isActive = (key: string) => hovered === key;
  const itemCls = (key: string) => cn(
    'relative z-10 px-3.5 py-1.5 font-body text-[13px] font-medium whitespace-nowrap transition-colors duration-150',
    isActive(key) ? 'text-[var(--cream)]' : 'text-[var(--mahogany)]/65 hover:text-[var(--mahogany)]',
  );

  return (
    <div ref={containerRef} className="relative flex items-center">
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute z-0 rounded-full bg-[var(--mahogany)]"
            style={{ height: 'calc(100% - 4px)', top: '2px' }}
            initial={{ opacity: 0, width: pill.width, x: pill.left }}
            animate={{ opacity: 1, width: pill.width, x: pill.left }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          />
        )}
      </AnimatePresence>

      <Link
        href="/login"
        ref={loginRef}
        onMouseEnter={() => { setHovered('login'); measure('login'); }}
        onMouseLeave={() => setHovered(null)}
        className={itemCls('login')}
      >
        Login
      </Link>

      <a
        href="#demo"
        ref={demoRef}
        onClick={onScrollDemo}
        onMouseEnter={() => { setHovered('demo'); measure('demo'); }}
        onMouseLeave={() => setHovered(null)}
        className={itemCls('demo')}
      >
        Try Demo
      </a>
    </div>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      {/* ── Desktop floating pill ── */}
      <header className="fixed top-5 inset-x-0 z-[100] hidden lg:flex justify-center px-4">
        <div
          className={cn(
            'flex h-12 items-center rounded-full backdrop-blur-[16px]',
            'border transition-all duration-300',
            // Generous horizontal padding so the pill has breathing room
            'pl-5 pr-3',
            scrolled
              ? 'border-[rgba(221,184,146,0.5)] bg-[rgba(255,253,249,0.95)] shadow-[0_4px_28px_rgba(127,85,57,0.12)]'
              : 'border-[rgba(221,184,146,0.28)] bg-[rgba(255,253,249,0.82)]',
            'dark:bg-[rgba(10,6,3,0.88)] dark:border-[rgba(221,184,146,0.2)]',
          )}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Logo />
          </Link>

          {/* Gap + divider */}
          <div className="mx-5 h-4 w-px bg-[rgba(221,184,146,0.3)]" />

          {/* Nav links */}
          <NavTabs />

          {/* Gap + divider */}
          <div className="mx-5 h-4 w-px bg-[rgba(221,184,146,0.3)]" />

          {/* Login + Try Demo with sliding pill */}
          <ActionLinks onScrollDemo={scrollToDemo} />

          {/* Gap + divider */}
          <div className="mx-4 h-4 w-px bg-[rgba(221,184,146,0.3)]" />

          {/* Sign up CTA */}
          <Link
            href="/signup"
            className="rounded-full bg-[var(--mahogany)] px-5 py-1.5 font-display text-[13px] font-semibold text-[var(--cream)] transition-colors hover:bg-[var(--rust)]"
          >
            Sign up
          </Link>
        </div>
      </header>

      {/* ── Mobile top bar ── */}
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-[100] flex lg:hidden h-14 items-center justify-between px-5 transition-all duration-300',
          scrolled
            ? 'border-b border-[rgba(221,184,146,0.3)] bg-[rgba(255,253,249,0.95)] backdrop-blur-[16px] shadow-[0_2px_12px_rgba(127,85,57,0.08)]'
            : 'bg-[rgba(255,253,249,0.8)] backdrop-blur-[12px]',
          'dark:bg-[rgba(10,6,3,0.88)] dark:border-[rgba(221,184,146,0.15)]',
        )}
      >
        <Link href="/"><Logo /></Link>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(221,184,146,0.35)] text-[var(--mahogany)]"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <IconX size={18} /> : <IconMenu2 size={18} />}
        </button>
      </header>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-x-3 top-16 z-[99] overflow-hidden rounded-2xl border border-[rgba(221,184,146,0.35)] bg-[rgba(255,253,249,0.97)] shadow-[0_8px_40px_rgba(127,85,57,0.15)] backdrop-blur-[20px] lg:hidden dark:bg-[rgba(10,6,3,0.95)] dark:border-[rgba(221,184,146,0.2)]"
          >
            <div className="flex flex-col gap-0.5 p-3">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-2.5 font-body text-sm font-medium text-[var(--mahogany)]/80 transition-colors hover:bg-[rgba(221,184,146,0.1)] hover:text-[var(--mahogany)]">
                  {link.label}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-2 border-t border-[rgba(221,184,146,0.2)] p-3">
              <Link href="/login" onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-[rgba(221,184,146,0.4)] px-4 py-2.5 text-center font-display text-sm font-semibold text-[var(--mahogany)] hover:bg-[rgba(221,184,146,0.08)]">
                Login
              </Link>
              <a href="#demo" onClick={(e) => { setMobileOpen(false); scrollToDemo(e); }}
                className="rounded-xl border border-[rgba(221,184,146,0.4)] px-4 py-2.5 text-center font-display text-sm font-semibold text-[var(--mahogany)] hover:bg-[rgba(221,184,146,0.08)]">
                Try Demo
              </a>
              <Link href="/signup" onClick={() => setMobileOpen(false)}
                className="rounded-xl bg-[var(--mahogany)] px-4 py-2.5 text-center font-display text-sm font-semibold text-[var(--cream)] hover:bg-[var(--rust)]">
                Sign up
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
