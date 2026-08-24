import { AccessGate } from '../../components/shared/AccessGate';
import { ProfileGate } from '../../components/shared/ProfileGate';

// ProfileGate runs first and outside the paywall: an account with no mobile
// (Google sign-ups, which Google gives no phone number for) is asked for one
// before anything else, including before it is asked to pay.
//
// AccessGate then owns the chrome: paid / allowlisted / in-trial accounts get
// the full dashboard shell; everyone else gets a bare plans screen (trial ₹10k,
// onboarding ₹50k, ₹5k/mo) with no sidebar at all.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileGate>
      <AccessGate>{children}</AccessGate>
    </ProfileGate>
  );
}
