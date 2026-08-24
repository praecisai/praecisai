'use client';

import { useState } from 'react';
import { Loader2, Phone } from 'lucide-react';
import { useMe, useUpdateMyPhone } from '../../lib/api/hooks';
import { BareChrome } from './AccessGate';

/**
 * Indian mobile, accepted loosely (spaces, dashes, +91, leading 0) and sent as
 * bare 10 digits. The backend normalizes to E.164 (+91XXXXXXXXXX).
 */
function mobileDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function isValidMobile(raw: string): boolean {
  return /^[6-9]\d{9}$/.test(mobileDigits(raw));
}

/**
 * Collects the owner's mobile when the account has none. The signup form makes
 * it mandatory, but Google sign-ups skip that form entirely and Google hands
 * over no phone number, so those accounts arrive with a null.
 *
 * Sits OUTSIDE the paywall on purpose: the number is most valuable for a lead
 * who has not paid yet, which is exactly who the paywall would be showing.
 */
export function ProfileGate({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading, isError } = useMe();
  const updatePhone = useUpdateMyPhone();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--cream)' }}
      >
        <Loader2 size={22} className="animate-spin text-[var(--walnut)]" />
      </div>
    );
  }

  // An unreachable API is not the same as a missing number: fall through and
  // let AccessGate render its own "cannot reach the server" retry screen.
  if (isError || !me || me.phone) return <>{children}</>;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidMobile(phone)) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setError('');
    updatePhone.mutate(mobileDigits(phone), {
      onError: (err: any) => setError(err.message ?? 'Could not save your number'),
    });
  }

  return (
    <BareChrome>
      <div className="p-4 sm:p-8 max-w-md mx-auto">
        <div className="text-center mb-6">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: 'var(--sand)' }}
          >
            <Phone size={19} className="text-[var(--mahogany)]" />
          </div>
          <h1 className="font-display text-xl font-bold text-[var(--dark-brown)]">
            One last thing
          </h1>
          <p className="text-sm text-[var(--walnut)] mt-1.5">
            Add your mobile number so the Praecis team can reach you about your account setup.
          </p>
        </div>

        <form onSubmit={submit} className="glass-card p-6 space-y-4">
          {error && (
            <div
              className="p-3 rounded-lg text-sm border"
              style={{
                background: 'rgba(127,29,29,0.06)',
                borderColor: 'rgba(127,29,29,0.2)',
                color: '#7F1D1D',
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--walnut)] mb-1.5 uppercase tracking-wider">
              Mobile Number
            </label>
            {/* Focus ring on the wrapper so the +91 prefix and the field light
                up as one control. */}
            <div
              className="flex items-stretch rounded-[10px] border transition-shadow focus-within:border-[var(--mahogany)] focus-within:shadow-[0_0_0_3px_rgba(127,85,57,0.12)]"
              style={{ borderColor: 'var(--caramel)', background: 'var(--surface-warm)' }}
            >
              <span
                className="flex items-center px-3 text-sm font-medium text-[var(--walnut)] border-r flex-shrink-0 rounded-l-[10px]"
                style={{ background: 'var(--sand)', borderColor: 'var(--caramel)' }}
              >
                +91
              </span>
              <input
                autoFocus
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="input-dark focus:shadow-none"
                style={{ border: 'none', borderRadius: 0, background: 'transparent' }}
                placeholder="98765 43210"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={updatePhone.isPending}
            className="w-full py-2.5 rounded-lg text-sm font-bold disabled:opacity-50"
            style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
          >
            {updatePhone.isPending ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </BareChrome>
  );
}
