'use client';

import { useState } from 'react';
import { TopHeader } from '../../../components/layout/Sidebar';
import { useMe } from '../../../lib/api/hooks';
import { Settings, Users, Shield, Bell, Database } from 'lucide-react';

const TABS = [
  { id: 'business', label: 'Business', icon: Settings },
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'segments', label: 'Segment Rules', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

const DEFAULT_SEGMENT_RULES = [
  { range: '0–60 days', segment: 'Soft Reminder', color: '#3b82f6' },
  { range: '61–120 days', segment: 'Follow-up', color: '#f59e0b' },
  { range: '121–180 days', segment: 'Strong Follow-up', color: '#f97316' },
  { range: '181+ days', segment: 'Escalation', color: '#ef4444' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('business');
  const { data: user } = useMe();

  return (
    <div>
      <TopHeader title="Settings" subtitle="Configure your business settings" />
      <div className="p-6 flex gap-5">
        {/* Sidebar tabs */}
        <div className="w-48 flex-shrink-0 space-y-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`sidebar-item w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                activeTab === id ? 'active text-blue-400' : 'text-slate-400 hover:text-white'
              }`}>
              <Icon size={15} className={activeTab === id ? 'text-blue-400' : 'text-slate-500'} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'business' && (
            <div className="glass-card p-6 space-y-5">
              <h3 className="font-semibold text-white">Business Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Business Name</label>
                  <input className="input-dark" defaultValue={user?.business?.name ?? ''} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Plan</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white">{user?.business?.plan ?? 'FREE'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Current</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Business ID</label>
                  <p className="text-xs font-mono text-slate-500 bg-[var(--surface-warm)]/3 px-3 py-2 rounded-lg">{user?.business_id ?? '—'}</p>
                </div>
                <button className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="glass-card p-6">
              <h3 className="font-semibold text-white mb-4">Users & Roles</h3>
              <div className="space-y-3">
                {[
                  { role: 'BUSINESS_OWNER', desc: 'Full access to all features', color: '#a78bfa' },
                  { role: 'MANAGER', desc: 'Manage agents, view all data, configure campaigns', color: '#60a5fa' },
                  { role: 'RECOVERY_AGENT', desc: 'View assigned customers, log interactions', color: '#34d399' },
                ].map(({ role, desc, color }) => (
                  <div key={role} className="flex items-start gap-3 p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                    <div>
                      <p className="text-sm font-medium text-white">{role}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-4">User management via the Users API. RBAC enforced on all endpoints.</p>
            </div>
          )}

          {activeTab === 'segments' && (
            <div className="glass-card p-6">
              <h3 className="font-semibold text-white mb-1">Segment Rules</h3>
              <p className="text-xs text-slate-400 mb-5">These rules determine how customers are categorized. Recalculated on every import.</p>
              <div className="space-y-3">
                {DEFAULT_SEGMENT_RULES.map(({ range, segment, color }) => (
                  <div key={segment} className="flex items-center gap-4 p-3 rounded-lg glass-card">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{range}</p>
                      <p className="text-xs text-slate-400">{segment}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>
                      Default
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-4">Custom rules per business coming in the next release.</p>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="glass-card p-6">
              <h3 className="font-semibold text-white mb-4">Notifications</h3>
              <div className="space-y-3">
                {['Import completed', 'Campaign finished', 'Promise-to-pay due', 'Weekly summary digest'].map((n) => (
                  <div key={n} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <span className="text-sm text-white">{n}</span>
                    <div className="w-9 h-5 rounded-full bg-blue-500/30 relative cursor-pointer">
                      <div className="w-4 h-4 rounded-full bg-blue-400 absolute top-0.5 right-0.5" />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-4">Notification delivery via email/SMS - coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
