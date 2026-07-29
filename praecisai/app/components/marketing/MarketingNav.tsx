'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconMenu2, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils/cn';
import { Logo } from '../landing/Logo';

/**
 * Nav for the standalone marketing pages.
 *
 * Deliberately separate from the homepage `Navbar`: this one uses absolute
 * hrefs (`/#pricing`, `/industries/...`) because in-page anchors do not resolve
 * from a subpage. The homepage navbar is left untouched.
 */

const navLinks = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Features', href: '/features' },
  { label: 'Industries', href: '/industries' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/faq' },
];

export default function MarketingNav() {
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
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <header
      className={cn(
        'sticky top-0 z-[100] w-full transition-all duration-300',
        scrolled
          ? 'border-b border-[rgba(221,184,146,0.4)] bg-[rgba(255,253,249,0.95)] shadow-[0_2px_16px_rgba(127,85,57,0.08)] backdrop-blur-[16px]'
          : 'border-b border-[rgba(221,184,146,0.22)] bg-[rgba(255,253,249,0.85)] backdrop-blur-[12px]',
        'dark:border-[rgba(221,184,146,0.18)] dark:bg-[rgba(10,6,3,0.9)]',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center" aria-label="PraecisAI home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-1.5 font-body text-[13px] font-medium text-[var(--mahogany)]/70 transition-colors hover:bg-[rgba(221,184,146,0.18)] hover:text-[var(--mahogany)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-full px-3.5 py-1.5 font-body text-[13px] font-medium text-[var(--mahogany)]/70 transition-colors hover:text-[var(--mahogany)] sm:inline-flex"
          >
            Login
          </Link>
          <Link
            href="/#demo"
            className="rounded-full bg-[var(--mahogany)] px-4 py-2 font-display text-[13px] font-semibold text-[var(--cream)] transition-colors hover:bg-[var(--rust)] sm:px-5"
          >
            See Live Demo
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(221,184,146,0.4)] text-[var(--mahogany)] lg:hidden"
          >
            {mobileOpen ? <IconX size={18} /> : <IconMenu2 size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[rgba(221,184,146,0.28)] bg-[var(--surface-warm)] lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-0.5 px-4 py-3" aria-label="Mobile">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-2.5 font-body text-sm font-medium text-[var(--mahogany)]/80 transition-colors hover:bg-[rgba(221,184,146,0.14)]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-4 py-2.5 font-body text-sm font-medium text-[var(--mahogany)]/80 transition-colors hover:bg-[rgba(221,184,146,0.14)]"
            >
              Login
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
