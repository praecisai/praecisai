'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/client';
import { Logo } from '../../components/landing/Logo';

/**
 * Where a password-recovery link lands. By the time this renders, /auth/callback
 * has already exchanged the recovery code for a session, so updateUser() acts on
 * the right account without the token ever being handled here.
 *
 * Works for Google-only accounts too: setting a password ADDS email sign-in and
 * leaves the Google identity untouched, so the client keeps both ways in.
 */
export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  // A recovery link that was already used, expired, or opened in a different
  // browser leaves no session. Say so plainly instead of failing on submit.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setChecking(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Both passwords must match.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5 py-8 sm:py-10"
      style={{ background: 'var(--cream)' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="font-display text-[26px] font-bold text-[var(--dark-brown)]">
            Set a new password
          </h1>
          <p className="font-body text-sm text-[var(--walnut)] mt-1.5">
            You can still sign in with Google afterwards.
          </p>
        </div>

        <div className="glass-card p-6 sm:p-8">
          {checking ? (
            <p className="text-sm text-[var(--walnut)] text-center py-4">Checking your link…</p>
          ) : !hasSession ? (
            <div className="space-y-5">
              <div
                className="p-3 rounded-lg text-sm border"
                style={{
                  background: 'rgba(127,29,29,0.06)',
                  borderColor: 'rgba(127,29,29,0.2)',
                  color: '#7F1D1D',
                }}
              >
                This reset link has expired or was already used. Please request a new one.
              </div>
              <Link
                href="/login"
                className="block w-full py-3 rounded-xl font-display font-semibold text-center text-[var(--cream)] transition-all hover:bg-[var(--rust)]"
                style={{ background: 'var(--mahogany)' }}
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
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
                  New password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="input-dark"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--walnut)] mb-1.5 uppercase tracking-wider">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="input-dark"
                  placeholder="Re-enter the password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-display font-semibold text-[var(--cream)] transition-all hover:bg-[var(--rust)] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                style={{ background: 'var(--mahogany)' }}
              >
                {loading ? 'Saving…' : 'Save password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
