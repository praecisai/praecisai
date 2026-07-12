'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import Loader from '../../components/ui/Loader';
import DemoDashboardHeader from '../../components/demo/DemoDashboardHeader';
import DemoExhaustedBanner from '../../components/demo/DemoExhaustedBanner';
import DemoStatCards from '../../components/demo/DemoStatCards';
import DemoOutstandingTable from '../../components/demo/DemoOutstandingTable';
import DemoCreditsBadge from '../../components/demo/DemoCreditsBadge';

export type DemoLead = {
  id: string;
  name: string;
  phone: string;
  businessName: string;
  whatsappUsed: number;
  whatsappAllowed: number;
  callsUsed: number;
  callsAllowed: number;
  status: 'SIGNED_UP' | 'EXHAUSTED';
};

export default function DemoDashboardClient({ token }: { token: string }) {
  const [lead, setLead] = useState<DemoLead | null>(null);
  const [pastRuns, setPastRuns] = useState<Array<{ party_name: string; demo_type: string; status: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creditsRefresh, setCreditsRefresh] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const fetchLead = async () => {
      try {
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
        const res = await fetch(`${backendUrl}/api/v1/demo-leads/validate-token/${token}`);
        if (!res.ok) throw new Error('Invalid token');
        const resData = await res.json();
        setLead(resData.data);

        // Also fetch past runs so we can restore per-row button state
        const runsRes = await fetch(`${backendUrl}/api/v1/demo-leads/${token}/runs`);
        if (runsRes.ok) {
          const runsData = await runsRes.json();
          // Backend may wrap in { data: [...] } envelope or return array directly
          const runsArray = Array.isArray(runsData) ? runsData : (runsData?.data ?? []);
          setPastRuns(runsArray);
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Token validation error:', err);
        }
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    fetchLead();
  }, [token, router]);

  const handleActionComplete = (type: 'WHATSAPP' | 'VOICE_CALL') => {
    // Refresh the credits badge ~90s later, after the call finishes and Bolna
    // deducts its cost (backend also caches for 60s, so earlier is pointless).
    setTimeout(() => setCreditsRefresh((n) => n + 1), 90_000);
    setLead((prev) => {
      if (!prev) return prev;
      const newWhatsappUsed = prev.whatsappUsed + (type === 'WHATSAPP' ? 1 : 0);
      const newCallsUsed = prev.callsUsed + (type === 'VOICE_CALL' ? 1 : 0);
      return {
        ...prev,
        whatsappUsed: newWhatsappUsed,
        callsUsed: newCallsUsed,
        status: (newWhatsappUsed >= prev.whatsappAllowed && newCallsUsed >= prev.callsAllowed) ? 'EXHAUSTED' : 'SIGNED_UP',
      };
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)]">
        <Loader
          title="Preparing your demo..."
          subtitle="Setting up your recovery intelligence dashboard"
          size="md"
        />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--cream)] px-4 text-center">
        <div className="rounded-3xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-10 shadow-xl max-w-md">
          <h2 className="font-display text-2xl font-semibold text-[var(--dark-brown)] mb-4">
            Link Expired
          </h2>
          <p className="font-body text-[var(--walnut)] mb-8">
            {error}
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full rounded-xl bg-[var(--mahogany)] px-6 py-3 font-display font-semibold text-white transition-colors hover:bg-[var(--rust)]"
          >
            Request a new Demo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--cream)]">
      <DemoDashboardHeader 
        businessName={lead.businessName}
        whatsappUsed={lead.whatsappUsed}
        whatsappAllowed={lead.whatsappAllowed}
        callsUsed={lead.callsUsed}
        callsAllowed={lead.callsAllowed}
      />

      {lead.status === 'EXHAUSTED' && <DemoExhaustedBanner />}

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 rounded-xl border border-[var(--caramel)] bg-[var(--sand)] px-4 sm:px-6 py-4 flex items-center gap-3 flex-wrap">
          <AlertTriangle className="h-5 w-5 text-[var(--rust)] shrink-0" />
          <p className="font-body text-sm font-medium text-[var(--walnut)] flex-1 min-w-[240px]">
            <span className="font-bold text-[var(--dark-brown)]">This is sample data for demonstration.</span> Your real outstanding report will look exactly like this once imported.
          </p>
          <DemoCreditsBadge token={token} refreshKey={creditsRefresh} />
        </div>

        <DemoStatCards />

        <div className="mt-8">
          <DemoOutstandingTable 
            token={token} 
            whatsappUsed={lead.whatsappUsed}
            whatsappAllowed={lead.whatsappAllowed}
            callsUsed={lead.callsUsed}
            callsAllowed={lead.callsAllowed}
            phone={lead.phone}
            pastRuns={pastRuns}
            onActionComplete={handleActionComplete}
          />
        </div>
      </main>
    </div>
  );
}
