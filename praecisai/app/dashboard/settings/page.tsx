'use client';

import { useState, useEffect } from 'react';
import { TopHeader } from '../../../components/layout/Sidebar';
import { Select } from '../../../components/ui/Select';
import { useMe, useUpdateBusiness, useBolnaCredits } from '../../../lib/api/hooks';
import { Settings, Users, Shield, Coins, Star } from 'lucide-react';
import { toast } from 'sonner';

const TABS = [
  { id: 'business', label: 'Business', icon: Settings },
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'segments', label: 'Segment Rules', icon: Shield },
  { id: 'credits', label: 'Credit Status', icon: Coins },
];

const SEGMENT_META = [
  { segment: 'No Follow-up', color: '#6B7280', desc: 'No calls or messages at all: fresh bills in this range are left alone' },
  { segment: 'Soft Reminder', color: 'var(--recovery-green)', desc: 'Gentle first reminder: no pressure' },
  { segment: 'Follow-up', color: '#B8860B', desc: 'Friendly follow-up asking for a rough date' },
  { segment: 'Strong Follow-up', color: '#E65100', desc: 'Firm but respectful: accounts team update' },
  { segment: 'Escalation', color: '#C62828', desc: 'Senior team involved: humble but urgent' },
];

// Scripts the AI can speak: the VIP range must map to one of these
const CONTACT_SEGMENTS = ['Soft Reminder', 'Follow-up', 'Strong Follow-up', 'Escalation'];

// Upper bounds of [No Follow-up, Soft Reminder, Follow-up, Strong Follow-up]
const DEFAULT_BOUNDS = [0, 60, 120, 180];

function boundsFromRules(rules: any): number[] {
  if (!Array.isArray(rules)) return DEFAULT_BOUNDS;
  const sorted = [...rules].sort((a, b) => a.min_days - b.min_days);
  if (sorted.length === 5) {
    const bounds = [sorted[0]?.max_days, sorted[1]?.max_days, sorted[2]?.max_days, sorted[3]?.max_days];
    if (bounds.every((b) => typeof b === 'number')) return bounds as number[];
  }
  // Legacy 4-rule config from before No Follow-up existed: its range is 0
  if (sorted.length === 4) {
    const bounds = [sorted[0]?.max_days, sorted[1]?.max_days, sorted[2]?.max_days];
    if (bounds.every((b) => typeof b === 'number')) return [0, ...(bounds as number[])];
  }
  return DEFAULT_BOUNDS;
}

function rulesFromBounds(bounds: number[]) {
  return [
    { min_days: 0, max_days: bounds[0], segment: 'No Follow-up' },
    { min_days: bounds[0] + 1, max_days: bounds[1], segment: 'Soft Reminder' },
    { min_days: bounds[1] + 1, max_days: bounds[2], segment: 'Follow-up' },
    { min_days: bounds[2] + 1, max_days: bounds[3], segment: 'Strong Follow-up' },
    { min_days: bounds[3] + 1, max_days: null, segment: 'Escalation' },
  ];
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('business');
  const { data: user } = useMe();
  const updateBusiness = useUpdateBusiness();

  const [businessName, setBusinessName] = useState('');
  const [handoffNumber, setHandoffNumber] = useState('');
  const [bounds, setBounds] = useState<number[]>(DEFAULT_BOUNDS);
  // VIP override: day range + which segment's call/template VIPs in it receive
  const [vipEnabled, setVipEnabled] = useState(false);
  const [vipMin, setVipMin] = useState(0);
  const [vipMax, setVipMax] = useState(180);
  const [vipSegment, setVipSegment] = useState('Soft Reminder');

  useEffect(() => {
    if (user?.business?.name) setBusinessName(user.business.name);
    setHandoffNumber(user?.business?.handoff_number ?? '');
    setBounds(boundsFromRules(user?.business?.segment_rules));
    const vr = user?.business?.vip_rule;
    if (vr && typeof vr.min_days === 'number') {
      setVipEnabled(true);
      setVipMin(vr.min_days);
      setVipMax(typeof vr.max_days === 'number' ? vr.max_days : 9999);
      setVipSegment(vr.segment ?? 'Soft Reminder');
    } else {
      setVipEnabled(false);
    }
  }, [user?.business?.name, user?.business?.handoff_number, user?.business?.segment_rules, user?.business?.vip_rule]);

  const boundsValid =
    bounds[0] >= 0 && bounds[1] > bounds[0] && bounds[2] > bounds[1] && bounds[3] > bounds[2];
  const vipValid = !vipEnabled || (vipMin >= 0 && vipMax >= vipMin);
  // Empty is allowed (falls back to platform default); otherwise must look like a phone number.
  const handoffValid = /^(\+?[0-9]{10,15})?$/.test(handoffNumber.trim());

  const saveBusiness = async () => {
    if (!handoffValid) return;
    try {
      await updateBusiness.mutateAsync({ name: businessName.trim(), handoff_number: handoffNumber.trim() });
      toast.success('Business settings saved', {
        description: handoffNumber.trim()
          ? `Senior transfers will go to ${handoffNumber.trim()}. On calls, Meena will say “${spokenName}”.`
          : `On calls, Meena will say “${spokenName}”.`,
      });
    } catch (e: any) {
      toast.error('Could not save business settings', { description: e.message });
    }
  };

  const saveSegments = async () => {
    if (!boundsValid || !vipValid) return;
    try {
      await updateBusiness.mutateAsync({
        segment_rules: rulesFromBounds(bounds),
        vip_rule: vipEnabled
          ? { min_days: vipMin, max_days: vipMax, segment: vipSegment }
          : null,
      });
      toast.success('Segment rules saved', {
        description: 'All customers were re-segmented with the new day ranges.',
      });
    } catch (e: any) {
      toast.error('Could not save segment rules', { description: e.message });
    }
  };

  const spokenName = businessName.replace(/\s+(llp|ltd\.?|pvt\.?\s*ltd\.?|private\s+limited|limited)\s*$/i, '').trim();

  const ranges = [
    `0 – ${bounds[0]} days`,
    `${bounds[0] + 1} – ${bounds[1]} days`,
    `${bounds[1] + 1} – ${bounds[2]} days`,
    `${bounds[2] + 1} – ${bounds[3]} days`,
    `${bounds[3] + 1}+ days`,
  ];

  return (
    <div>
      <TopHeader title="Settings" subtitle="Configure your business settings" />
      <div className="p-4 sm:p-6 flex flex-col lg:flex-row gap-5">
        {/* Sidebar tabs */}
        <div className="w-full lg:w-48 flex-shrink-0 flex lg:flex-col gap-1 lg:gap-0 lg:space-y-0.5 overflow-x-auto pb-1 lg:pb-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`sidebar-item whitespace-nowrap lg:w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                activeTab === id ? 'active text-[var(--mahogany)]' : 'text-[var(--walnut)] hover:text-[var(--mahogany)]'
              }`}>
              <Icon size={15} className={activeTab === id ? 'text-[var(--mahogany)]' : 'text-[var(--walnut)]'} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'business' && (
            <div className="glass-card p-4 sm:p-6 space-y-5">
              <h3 className="font-semibold text-[var(--dark-brown)]">Business Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[var(--walnut)] mb-1.5 uppercase tracking-wider">Business Name</label>
                  <input
                    className="input-dark"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                  <p className="text-xs text-[var(--walnut)] mt-1.5">
                    Shown on statement PDFs as written. On AI calls, legal suffixes are dropped automatically —
                    Meena will say &ldquo;<span className="font-semibold text-[var(--mahogany)]">{spokenName || '…'}</span>&rdquo;.
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-[var(--walnut)] mb-1.5 uppercase tracking-wider">Call Transfer Number</label>
                  <input
                    className="input-dark"
                    value={handoffNumber}
                    onChange={(e) => setHandoffNumber(e.target.value)}
                    placeholder="+919876543210"
                  />
                  <p className="text-xs text-[var(--walnut)] mt-1.5">
                    When a customer asks to speak with a senior, Meena transfers the call to this number.
                    Leave blank to use the platform default.
                  </p>
                  {!handoffValid && (
                    <p className="text-xs mt-1" style={{ color: '#C62828' }}>
                      Enter a valid phone number, e.g. +919876543210.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-[var(--walnut)] mb-1.5 uppercase tracking-wider">Plan</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--dark-brown)]">{user?.business?.plan ?? 'FREE'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--sand)', color: 'var(--mahogany)', border: '1px solid var(--caramel)' }}>Current</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[var(--walnut)] mb-1.5 uppercase tracking-wider">Business ID</label>
                  <p className="text-xs font-mono text-[var(--walnut)] px-3 py-2 rounded-lg" style={{ background: 'var(--sand)' }}>{user?.business_id ?? '-'}</p>
                </div>
                <button
                  onClick={saveBusiness}
                  disabled={updateBusiness.isPending || businessName.trim().length < 2 || !handoffValid}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--cream)] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, var(--walnut), var(--mahogany))' }}>
                  {updateBusiness.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="glass-card p-4 sm:p-6">
              <h3 className="font-semibold text-[var(--dark-brown)] mb-4">Users & Roles</h3>
              <div className="space-y-3">
                {[
                  { role: 'BUSINESS_OWNER', desc: 'Full access to all features' },
                  { role: 'MANAGER', desc: 'Manage agents, view all data, configure campaigns' },
                  { role: 'RECOVERY_AGENT', desc: 'View assigned customers, log interactions' },
                ].map(({ role, desc }) => (
                  <div key={role} className="flex items-start gap-3 p-4 rounded-lg" style={{ background: 'var(--sand)' }}>
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--mahogany)' }} />
                    <div>
                      <p className="text-sm font-medium text-[var(--dark-brown)]">{role}</p>
                      <p className="text-xs text-[var(--walnut)] mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[var(--walnut)] mt-4">User management via the Users API. RBAC enforced on all endpoints.</p>
            </div>
          )}

          {activeTab === 'segments' && (
            <div className="glass-card p-4 sm:p-6">
              <h3 className="font-semibold text-[var(--dark-brown)] mb-1">Segment Rules</h3>
              <p className="text-xs text-[var(--walnut)] mb-5">
                Day ranges decide each customer&apos;s segment: which controls the AI call script, the WhatsApp
                template and the statement colour. Customers in <b>No Follow-up</b> receive no calls or messages
                at all. Saving re-segments every customer instantly.
              </p>
              <div className="space-y-3">
                {SEGMENT_META.map(({ segment, color, desc }, i) => (
                  <div key={segment} className="flex flex-wrap items-center gap-3 sm:gap-4 p-3 rounded-lg" style={{ background: 'var(--sand)' }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--dark-brown)]">{segment}</p>
                      <p className="text-xs text-[var(--walnut)]">{desc}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--walnut)]">
                      {i < 4 ? (
                        <>
                          <span>{i === 0 ? 0 : bounds[i - 1] + 1} –</span>
                          <input
                            type="number"
                            min={0}
                            value={bounds[i]}
                            onChange={(e) => {
                              const v = parseInt(e.target.value) || 0;
                              setBounds((b) => b.map((x, j) => (j === i ? v : x)));
                            }}
                            className="input-dark w-20 text-center"
                          />
                          <span>days</span>
                        </>
                      ) : (
                        <span className="text-sm font-medium" style={{ color }}>{ranges[4]}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {!boundsValid && (
                <p className="text-xs mt-3" style={{ color: '#C62828' }}>
                  Each boundary must be larger than the previous one.
                </p>
              )}

              {/* VIP override: only applies to starred customers */}
              <div className="mt-5 p-3 rounded-lg border" style={{ background: 'rgba(234,179,8,0.06)', borderColor: 'rgba(234,179,8,0.35)' }}>
                <div className="flex flex-wrap items-center gap-3">
                  <Star size={14} className="text-yellow-500 flex-shrink-0" fill="currentColor" />
                  <div className="flex-1 min-w-44">
                    <p className="text-sm font-medium text-[var(--dark-brown)]">VIP Range</p>
                    <p className="text-xs text-[var(--walnut)]">
                      Only for VIP customers: within this day range, VIP calls and messages use the chosen
                      script below instead of the normal segment. VIPs are still contacted only when you
                      trigger them manually.
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none" style={{ color: 'var(--dark-brown)' }}>
                    <input type="checkbox" checked={vipEnabled} onChange={(e) => setVipEnabled(e.target.checked)} />
                    Enabled
                  </label>
                </div>
                {vipEnabled && (
                  <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-[var(--walnut)]">
                    <input
                      type="number" min={0} value={vipMin}
                      onChange={(e) => setVipMin(parseInt(e.target.value) || 0)}
                      className="input-dark w-20 text-center" title="Start (days overdue)"
                    />
                    <span>–</span>
                    <input
                      type="number" min={0} value={vipMax}
                      onChange={(e) => setVipMax(parseInt(e.target.value) || 0)}
                      className="input-dark w-20 text-center" title="End (days overdue)"
                    />
                    <span>days, send</span>
                    <Select
                      className="w-44"
                      value={vipSegment}
                      onChange={(v) => setVipSegment(v)}
                      options={CONTACT_SEGMENTS.map((s) => ({ value: s, label: s }))}
                    />
                    <span>call / template</span>
                  </div>
                )}
                {!vipValid && (
                  <p className="text-xs mt-2" style={{ color: '#C62828' }}>
                    The VIP range end must be greater than or equal to its start.
                  </p>
                )}
              </div>

              <button
                onClick={saveSegments}
                disabled={updateBusiness.isPending || !boundsValid || !vipValid}
                className="mt-5 px-4 py-2 rounded-lg text-sm font-medium text-[var(--cream)] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--walnut), var(--mahogany))' }}>
                {updateBusiness.isPending ? 'Saving…' : 'Save Segment Rules'}
              </button>
            </div>
          )}

          {activeTab === 'credits' && <CreditStatus />}
        </div>
      </div>
    </div>
  );
}

function CreditStatus() {
  const { data: credits, isLoading } = useBolnaCredits();

  return (
    <div className="glass-card p-4 sm:p-6 space-y-4">
      <h3 className="font-semibold text-[var(--dark-brown)] mb-2">Credit Status</h3>
      <p className="text-sm text-[var(--walnut)] mb-4">
        Your remaining balance for telephony, transcription, and platform fees.
      </p>
      
      <div className="space-y-3">
        {/* Calls Balance Row */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--caramel)] bg-[var(--sand)] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--cream)] flex items-center justify-center text-[var(--mahogany)]">
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-sm text-[var(--dark-brown)]">Call Credits</p>
              <p className="text-xs text-[var(--walnut)]">Telephony & AI platform</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-sm text-[var(--mahogany)]">
              {isLoading ? 'Loading...' : credits ? `${credits.balanceUsd < 0 ? '-' : ''}$${Math.abs(credits.balanceUsd).toFixed(2)}` : 'Unavailable'}
            </p>
            {credits?.estCallsLeft !== null && credits?.estCallsLeft !== undefined && (
              <p className="text-xs opacity-75 text-[var(--mahogany)]">≈{credits.estCallsLeft} calls left</p>
            )}
          </div>
        </div>

        {/* Deepgram Row (if present) */}
        {typeof credits?.deepgramUsd === 'number' && (
          <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--caramel)] bg-[var(--sand)] shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--cream)] flex items-center justify-center text-[var(--mahogany)]">
                <Coins className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-sm text-[var(--dark-brown)]">Transcription Credits</p>
                <p className="text-xs text-[var(--walnut)]">Deepgram STT usage</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-sm text-[var(--mahogany)]">
                ${credits.deepgramUsd.toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="pt-4 border-t border-[rgba(221,184,146,0.35)] mt-6">
        <p className="text-xs text-[var(--walnut)]">
          Top up integration coming soon. For now, please contact support to add credits to your account.
        </p>
      </div>
    </div>
  );
}
