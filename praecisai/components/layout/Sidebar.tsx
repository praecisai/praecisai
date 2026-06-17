'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import {
  LayoutDashboard, Users, FileText, TrendingDown,
  Upload, Megaphone, BarChart2, Settings, LogOut,
  ChevronRight, Bell, Search,
} from 'lucide-react';
import { useMe } from '../../lib/api/hooks';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/invoices', label: 'Invoices', icon: FileText },
  { href: '/dashboard/outstandings', label: 'Outstandings', icon: TrendingDown },
  { href: '/dashboard/import', label: 'Import Center', icon: Upload },
  { href: '/dashboard/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
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
    router.push('/login');
  }

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-screen sticky top-0"
      style={{ background: 'hsl(223,47%,13%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
          <span className="text-white font-bold text-sm">T</span>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white text-sm leading-tight truncate">
            {user?.business?.name ?? 'PraecisAI'}
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
            {ROLE_LABELS[user?.role ?? ''] ?? 'Loading…'}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
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
                isActive ? 'active text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-blue-400' : 'text-slate-500'} />
              {item.label}
              {isActive && <ChevronRight size={12} className="ml-auto text-blue-400/60" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-sm font-bold">
                {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'U'}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{user?.name ?? user?.email ?? '...'}</p>
            {user?.name && <p className="text-xs text-slate-400 truncate">{user.email}</p>}
          </div>
          <button
            id="logout-btn"
            onClick={handleLogout}
            title="Sign out"
            className="p-1 rounded-md text-slate-500 hover:text-red-400 transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function TopHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/5"
      style={{ background: 'hsl(223,47%,13%)' }}>
      <div>
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
          <Search size={16} />
        </button>
        <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all relative">
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        </button>
      </div>
    </header>
  );
}
