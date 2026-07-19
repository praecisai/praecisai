'use client';

import Link from 'next/link';
import { notFound, usePathname } from 'next/navigation';
import { useAdminMe } from '../../lib/api/hooks';
import { Building2, Bell, TicketPercent, ReceiptText, ArrowLeft, ShieldCheck } from 'lucide-react';

const NAV = [
  { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/coupons', label: 'Coupons', icon: TicketPercent },
  { href: '/admin/billing', label: 'Billing', icon: ReceiptText },
];

/**
 * Praecis staff area. The backend /admin/me probe 404s for anyone whose email
 * is not in ADMIN_EMAILS; we mirror that with notFound() so non-admins see a
 * plain 404 page with no hint that /admin exists.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, isLoading, isError } = useAdminMe();

  if (isError) notFound();

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cream)' }}>
        <p className="text-sm text-[var(--walnut)]">Checking access…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <header
        className="sticky top-0 z-20 border-b px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{ background: 'var(--surface-warm)', borderColor: 'rgba(221,184,146,0.4)' }}
      >
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} className="text-[var(--mahogany)]" />
          <div>
            <p className="font-display font-bold text-[var(--dark-brown)] leading-tight">PraecisAI Admin</p>
            <p className="text-[11px] text-[var(--walnut)]">Internal operations panel</p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--walnut)] hover:text-[var(--mahogany)]"
        >
          <ArrowLeft size={13} /> Back to dashboard
        </Link>
      </header>

      <nav
        className="px-4 sm:px-6 border-b flex gap-1 overflow-x-auto"
        style={{ background: 'var(--surface-warm)', borderColor: 'rgba(221,184,146,0.4)' }}
      >
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                active
                  ? 'text-[var(--mahogany)] border-[var(--mahogany)]'
                  : 'text-[var(--walnut)] border-transparent hover:text-[var(--mahogany)]'
              }`}
            >
              <Icon size={15} strokeWidth={1.75} /> {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="p-4 sm:p-6">{children}</main>
    </div>
  );
}
