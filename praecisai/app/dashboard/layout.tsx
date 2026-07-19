import { DashboardShell } from '../../components/layout/Sidebar';
import { AccessGate } from '../../components/shared/AccessGate';

// AccessGate: paid / allowlisted / in-trial accounts see the dashboard;
// everyone else gets the plans screen (trial ₹10k, onboarding ₹50k, ₹5k/mo).
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      <AccessGate>{children}</AccessGate>
    </DashboardShell>
  );
}
