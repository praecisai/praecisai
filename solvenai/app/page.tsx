import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, hsl(222,47%,11%) 0%, hsl(240,30%,9%) 100%)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span className="font-bold text-lg text-white">SolvenAI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">Sign In</Link>
          <Link href="/signup" className="text-sm px-4 py-2 rounded-lg font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
          style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
          AI-Powered Collections Platform
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
          Recover Outstanding
          <br />
          <span className="gradient-text">Dues 3× Faster</span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          SolvenAI automates your accounts receivable process — from importing Excel data to
          AI-powered follow-ups, WhatsApp reminders, and real-time analytics dashboards.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup" className="px-8 py-3.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            Start Free Trial
          </Link>
          <Link href="/login" className="px-8 py-3.5 rounded-xl font-semibold transition-all hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
            Sign In
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-5xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: '📊', title: 'Smart Import Engine', desc: 'Upload Excel/CSV files. Auto-map columns with AI, handle Indian date formats and credit notes.' },
            { icon: '🎯', title: 'Segment & Prioritize', desc: 'Auto-calculate aging buckets: Soft Reminder, Follow-up, Strong Follow-up, Escalation.' },
            { icon: '📱', title: 'WhatsApp & AI Calls', desc: 'Automated reminders, voice AI calls, and live Promise-to-Pay tracking.' },
            { icon: '🔒', title: 'Multi-Tenant Security', desc: 'Strict data isolation. Each business sees only their data. Role-based access control.' },
            { icon: '📈', title: 'Real-time Analytics', desc: 'Dashboard with aging breakdown, segment distribution, recovery rate, and campaign metrics.' },
            { icon: '🏢', title: 'Enterprise Ready', desc: 'Built on Next.js 15, NestJS, Supabase, Prisma. Scalable to millions of records.' },
          ].map((feature) => (
            <div key={feature.title} className="glass-card p-6 metric-card">
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center">
        <p className="text-xs text-slate-500">© 2026 SolvenAI. All rights reserved.</p>
      </footer>
    </div>
  );
}
