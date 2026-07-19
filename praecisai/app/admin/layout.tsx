'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useAdminMe,
  useAdminLogin,
  getAdminToken,
  setAdminToken,
} from '../../lib/api/hooks';
import {
  Building2, Bell, TicketPercent, ReceiptText, ArrowLeft,
  ShieldCheck, LogOut, KeyRound,
} from 'lucide-react';
import { AnimatedThemeToggler } from '../../registry/magicui/animated-theme-toggler';

const NAV = [
  { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/coupons', label: 'Coupons', icon: TicketPercent },
  { href: '/admin/billing', label: 'Billing', icon: ReceiptText },
];

/**
 * Standalone credential login for the operator. Independent of the normal
 * Google/Supabase login: only ADMIN_USERNAME/ADMIN_PASSWORD (backend/.env)
 * open this panel.
 */
function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const login = useAdminLogin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    login.mutate(
      { username, password },
      {
        onSuccess: () => onSuccess(),
        onError: (err: any) => setError(err.message),
      },
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--cream)' }}>
      <form
        onSubmit={submit}
        className="glass-card p-6 w-full max-w-sm space-y-4"
        style={{ background: 'var(--surface-warm)' }}
      >
        <div className="text-center">
          <ShieldCheck size={30} className="mx-auto mb-2 text-[var(--mahogany)]" />
          <h1 className="font-display font-bold text-lg text-[var(--dark-brown)]">PraecisAI Admin</h1>
          <p className="text-xs text-[var(--walnut)]">Operator access only</p>
        </div>

        {error && (
          <p
            className="text-xs px-3 py-2 rounded-lg"
            style={{ background: '#C6282812', color: '#C62828', border: '1px solid #C6282840' }}
          >
            {error}
          </p>
        )}

        <div>
          <label className="block text-[11px] font-semibold text-[var(--walnut)] uppercase tracking-wider mb-1">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="w-full px-3 py-2.5 rounded-lg text-sm border bg-[var(--surface-warm)] text-[var(--dark-brown)]"
            style={{ borderColor: 'var(--caramel)' }}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[var(--walnut)] uppercase tracking-wider mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full px-3 py-2.5 rounded-lg text-sm border bg-[var(--surface-warm)] text-[var(--dark-brown)]"
            style={{ borderColor: 'var(--caramel)' }}
          />
        </div>

        <button
          type="submit"
          disabled={login.isPending || !username || !password}
          className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
        >
          <KeyRound size={14} /> {login.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Always start false to match the server (localStorage is browser-only).
  // useEffect runs only on the client, so hasToken is set correctly after hydration.
  const [hasToken, setHasToken] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data, isLoading, isError, error } = useAdminMe();

  useEffect(() => {
    const token = getAdminToken();
    setHasToken(!!token);
    setMounted(true);
  }, []);

  // Clear a rejected token (run as effect, not during render)
  const rejected = isError && (error as any)?.status === 401;
  useEffect(() => {
    if (rejected && getAdminToken()) {
      setAdminToken(null);
      setHasToken(false);
    }
  }, [rejected]);

  // Wait for client-side mount before deciding which branch to show
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cream)' }}>
        <p className="text-sm text-[var(--walnut)]">Loading…</p>
      </div>
    );
  }

  if (!hasToken || rejected) {
    return <AdminLogin onSuccess={() => setHasToken(true)} />;
  }

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
        <div className="flex items-center gap-4">
          <AnimatedThemeToggler />
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--walnut)] hover:text-[var(--mahogany)]"
          >
            <ArrowLeft size={13} /> Dashboard
          </Link>
          <button
            onClick={() => {
              setAdminToken(null);
              setHasToken(false);
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--walnut)] hover:text-[var(--mahogany)]"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
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
