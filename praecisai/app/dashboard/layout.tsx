import { AccessGate } from '../../components/shared/AccessGate';

// AccessGate owns the chrome: paid / allowlisted / in-trial accounts get the
// full dashboard shell; everyone else gets a bare plans screen (trial ₹10k,
// onboarding ₹50k, ₹5k/mo) with no sidebar at all.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AccessGate>{children}</AccessGate>;
}
