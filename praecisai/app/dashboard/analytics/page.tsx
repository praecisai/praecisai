'use client';

import { TopHeader } from '../../../components/layout/Sidebar';
import { BarChart2, TrendingUp } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div>
      <TopHeader title="Analytics" subtitle="Performance insights and trends" />
      <div className="p-6 space-y-5">
        <div className="glass-card p-12 text-center">
          <BarChart2 size={48} className="text-blue-400/40 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Advanced Analytics</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            Detailed trend analysis, agent performance, recovery forecasting, and cohort analysis are coming soon.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}>
            <TrendingUp size={12} /> Coming Soon
          </div>
        </div>

        {/* Placeholder chart stubs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {['Recovery Trend', 'Agent Performance', 'Segment Movement', 'Campaign ROI'].map((title) => (
            <div key={title} className="glass-card p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{title}</p>
              <div className="h-32 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)' }}>
                <span className="text-xs text-slate-600">Chart placeholder</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
