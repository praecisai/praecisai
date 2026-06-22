'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import DemoDashboardHeader from '../../components/demo/DemoDashboardHeader';
import DemoExhaustedBanner from '../../components/demo/DemoExhaustedBanner';
import DemoStatCards from '../../components/demo/DemoStatCards';
import DemoOutstandingTable from '../../components/demo/DemoOutstandingTable';

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${backendUrl}/api/v1/demo-leads/validate-token/${token}`);
        if (!res.ok) throw new Error('Invalid token');
        const resData = await res.json();
        setLead(resData.data);
      } catch (err) {
        setError('This demo link has expired or is invalid.');
      } finally {
        setLoading(false);
      }
    };
    fetchLead();
  }, [token]);

  const handleActionComplete = (type: 'WHATSAPP' | 'VOICE_CALL') => {
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
        <Loader2 className="h-10 w-10 animate-spin text-[var(--mahogany)]" />
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

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
        <div className="mb-6 rounded-xl border border-[var(--caramel)] bg-[var(--sand)] px-6 py-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-[var(--rust)] shrink-0" />
          <p className="font-body text-sm font-medium text-[var(--walnut)]">
            <span className="font-bold text-[var(--dark-brown)]">This is sample data for demonstration.</span> Your real outstanding report will look exactly like this once imported.
          </p>
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
            onActionComplete={handleActionComplete}
          />
        </div>
      </main>
    </div>
  );
}
