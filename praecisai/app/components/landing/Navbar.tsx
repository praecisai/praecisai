'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { IconMenu2, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils/cn';
import { Logo } from './Logo';

const navLinks = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Reports', href: '#reports' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
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
        'fixed top-0 z-[100] w-full border-b transition-all duration-300',
        scrolled
          ? 'border-[var(--caramel)] bg-[color-mix(in_srgb,var(--cream)_96%,transparent)] shadow-[0_4px_24px_rgba(28,16,8,0.08)] backdrop-blur-[16px]'
          : 'border-[color-mix(in_srgb,var(--caramel)_20%,transparent)] bg-[color-mix(in_srgb,var(--cream)_88%,transparent)] backdrop-blur-[16px]',
      )}
    >
      <nav className="relative flex w-full h-16 items-center justify-between px-5 sm:px-8">
        <Link href="/" className="shrink-0 lg:ml-4">
          <Logo />
        </Link>

        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-body text-sm font-semibold text-[var(--mahogany)]/80 transition-colors hover:text-[var(--walnut)]"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="rounded-lg border border-[var(--mahogany)] px-4 py-2 font-display text-sm font-semibold text-[var(--mahogany)] transition-colors hover:bg-[var(--sand)]"
          >
            Login
          </Link>
          <Link
            href="#demo"
            className="rounded-lg border border-[var(--mahogany)] px-4 py-2 font-display text-sm font-semibold text-[var(--mahogany)] transition-colors hover:bg-[var(--sand)]"
          >
            Try Demo
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-[var(--mahogany)] px-5 py-2.5 font-display text-sm font-semibold text-[var(--cream)] transition-colors hover:bg-[var(--rust)]"
          >
            Sign up
          </Link>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[rgba(176,137,104,0.3)] text-[var(--mahogany)] lg:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <IconX size={20} /> : <IconMenu2 size={20} />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden border-t border-[var(--caramel)] bg-[color-mix(in_srgb,var(--cream)_98%,transparent)] backdrop-blur-[16px] lg:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-3 font-body text-sm font-medium text-[var(--dark-brown)]/80 transition-colors hover:bg-[var(--sand)] hover:text-[var(--dark-brown)]"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-[rgba(176,137,104,0.2)] pt-4">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border border-[var(--caramel)] px-3 py-3 text-center font-display text-sm font-semibold text-[var(--mahogany)] hover:bg-[var(--sand)]"
                >
                  Login
                </Link>
                <Link
                  href="#demo"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border border-[var(--caramel)] px-3 py-3 text-center font-display text-sm font-semibold text-[var(--mahogany)] hover:bg-[var(--sand)]"
                >
                  Try Demo
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg bg-[var(--mahogany)] px-3 py-3 text-center font-display text-sm font-semibold text-[var(--cream)] hover:bg-[var(--rust)]"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
