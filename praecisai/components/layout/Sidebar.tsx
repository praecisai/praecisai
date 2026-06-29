'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import {
  LayoutDashboard, Users, FileText, TrendingDown,
  Upload, Megaphone, BarChart2, Settings, LogOut,
  ChevronRight, Bell, Search, FileSpreadsheet,
} from 'lucide-react';
import { useMe } from '../../lib/api/hooks';
import { Logo } from '../../app/components/landing/Logo';
import { AnimatedThemeToggler } from '../../registry/magicui/animated-theme-toggler';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/invoices', label: 'Invoices', icon: FileText },
  { href: '/dashboard/outstandings', label: 'Outstandings', icon: TrendingDown },
  { href: '/dashboard/import', label: 'Import Center', icon: Upload },
  { href: '/dashboard/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/dashboard/pdc',       label: 'PDC Cheques', icon: FileSpreadsheet },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/settings',  label: 'Settings', icon: Settings },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  BUSINESS_OWNER: 'Owner',
  MANAGER: 'Manager',
  RECOVERY_AGENT: 'Agent',
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useMe();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col fixed top-0 left-0 bottom-0 z-30"
      style={{ background: 'var(--surface-warm)', borderRight: '1px solid var(--caramel)' }}
    >
      {/* Logo + Theme Toggle */}
      <div className="flex items-center justify-between px-5 py-5 border-b" style={{ borderColor: 'rgba(221,184,146,0.4)' }}>
        <Logo />
        <AnimatedThemeToggler />
      </div>

      {/* Nav — scrollable, pushes footer to bottom */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto min-h-0">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'active text-[var(--mahogany)]' : 'text-[var(--walnut)] hover:text-[var(--mahogany)]'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-[var(--mahogany)]' : 'text-[var(--walnut)]'} strokeWidth={1.75} />
              {item.label}
              {isActive && <ChevronRight size={12} className="ml-auto text-[var(--mahogany)]" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t" style={{ borderColor: 'rgba(221,184,146,0.4)' }}>
        <div
          className="flex items-center gap-3 px-2 py-2 rounded-lg"
          style={{ background: 'var(--sand)' }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, var(--walnut), var(--mahogany))' }}
          >
            {user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[var(--cream)] text-sm font-bold">
                {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'U'}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--dark-brown)] truncate">{user?.name ?? user?.email ?? '...'}</p>
            {user?.name && <p className="text-xs text-[var(--walnut)] truncate">{user.email}</p>}
          </div>
          <button
            id="logout-btn"
            onClick={handleLogout}
            title="Sign out"
            className="p-1 rounded-md text-[var(--walnut)] hover:text-[#7F1D1D] transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function TopHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header
      className="flex items-center justify-between px-6 py-4 border-b"
      style={{ background: 'var(--surface-warm)', borderColor: 'rgba(221,184,146,0.4)' }}
    >
      <div>
        <h1 className="text-lg font-semibold text-[var(--dark-brown)]">{title}</h1>
        {subtitle && <p className="text-xs text-[var(--walnut)] mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg text-[var(--walnut)] hover:text-[var(--mahogany)] transition-all" style={{ background: 'transparent' }}>
          <Search size={16} strokeWidth={1.75} />
        </button>
        <button
          className="p-2 rounded-lg text-[var(--walnut)] hover:text-[var(--mahogany)] transition-all relative"
          style={{ background: 'transparent' }}
        >
          <Bell size={16} strokeWidth={1.75} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--rust)]"></span>
        </button>
      </div>
    </header>
  );
}
