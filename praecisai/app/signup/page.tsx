'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';
import api from '../../lib/api/client';
import { Logo } from '../components/landing/Logo';
import { IconArrowLeft } from '@tabler/icons-react';

/**
 * Indian mobile, accepted loosely (spaces, dashes, +91, leading 0) and stored
 * as bare 10 digits. The backend normalizes to E.164 (+91XXXXXXXXXX).
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

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    // Checked before any account is created: a Supabase user that fails
    // onboarding afterwards is a half-made account the owner cannot fix.
    if (!isValidMobile(phone)) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    setError('');

    const supabase = createClient();

    // 1. Create Supabase auth user. The mobile rides along in user_metadata so
    // it survives email confirmation: the backend reads it from there when the
    // auth guard provisions the tenant before /auth/onboard ever runs.
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { phone: mobileDigits(phone) } },
    });
    if (authError || !data.user) {
      setError(authError?.message ?? 'Signup failed');
      setLoading(false);
      return;
    }

    // Supabase answers an already-registered email with a decoy user that has
    // an empty identities array and NO error, so email addresses can't be
    // enumerated. Without this check signup reports success, creates nothing,
    // and the password silently fails at login forever after.
    if ((data.user.identities?.length ?? 0) === 0) {
      setError('This email is already registered. Please sign in instead, or use "Forgot password" to set one.');
      setLoading(false);
      return;
    }

    // Email confirmation is on: there is no session yet, so onboarding would
    // fail unauthenticated. Send them to their inbox instead of the dashboard.
    if (!data.session) {
      setError('Almost there: confirm your email address from the link we just sent, then sign in.');
      setLoading(false);
      return;
    }

    // 2. Onboard: create business + user record
    try {
      await api.post('/auth/onboard', { businessName, phone: mobileDigits(phone) });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message ?? 'Failed to create business profile');
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setLoading(true);
    setError('');
    const supabase = createClient();
    // Wait for session recovery to settle first: if a stale session is being
    // cleaned up in the background, it would delete the PKCE code-verifier
    // cookie that signInWithOAuth writes, breaking the OAuth callback.
    await supabase.auth.getSession();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col sm:flex-row items-center justify-center px-5 py-8 sm:py-10 relative"
      style={{ background: 'var(--cream)' }}
    >
      {/* Absolute from sm up; in-flow on phones so it can't sit on top of the logo */}
      <Link
        href="/"
        className="self-start mb-6 sm:mb-0 sm:absolute sm:top-6 sm:left-6 flex items-center gap-2 font-body text-sm font-medium text-[var(--walnut)] hover:text-[var(--mahogany)] transition-colors"
      >
        <IconArrowLeft size={16} stroke={2} />
        Back to Home
      </Link>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="font-display text-[26px] font-bold text-[var(--dark-brown)]">Create your account</h1>
          <p className="font-body text-sm text-[var(--walnut)] mt-1.5">Get started with PraecisAI. 14 day free pilot.</p>
        </div>

        <div className="glass-card p-6 sm:p-8">
          <form onSubmit={handleSignup} className="space-y-5">
            {error && (
              <div
                className="p-3 rounded-lg text-sm border"
                style={{ background: 'rgba(127,29,29,0.06)', borderColor: 'rgba(127,29,29,0.2)', color: '#7F1D1D' }}
              >
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading}
              className="w-full py-3 rounded-xl font-display font-semibold text-[var(--dark-brown)] transition-all hover:bg-[var(--sand)] border flex items-center justify-center gap-3 disabled:opacity-50"
              style={{ borderColor: 'var(--caramel)', background: 'var(--surface-warm)' }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign up with Google
            </button>

            <div className="flex items-center my-6">
              <div className="flex-1 border-t" style={{ borderColor: 'var(--caramel)' }} />
              <span className="px-3 text-xs text-[var(--walnut)] uppercase tracking-wider">or sign up with email</span>
              <div className="flex-1 border-t" style={{ borderColor: 'var(--caramel)' }} />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--walnut)] mb-1.5 uppercase tracking-wider">
                Business Name
              </label>
              <input
                id="business-name"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                minLength={2}
                className="input-dark"
                placeholder="Acme Textiles Pvt. Ltd."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--walnut)] mb-1.5 uppercase tracking-wider">
                Work Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-dark"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--walnut)] mb-1.5 uppercase tracking-wider">
                Mobile Number
              </label>
              {/* The focus ring lives on the wrapper so the +91 prefix and the
                  field light up as one control. */}
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
                  id="phone"
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
              <p className="text-[11px] text-[var(--walnut)] mt-1.5">
                Please enter a WhatsApp number so our team can reach you easily during setup.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--walnut)] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="input-dark"
                placeholder="Min. 8 characters"
              />
            </div>

            <button
              id="signup-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-display font-semibold text-[var(--cream)] transition-all hover:bg-[var(--rust)] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--mahogany)' }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--walnut)] mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--mahogany)] hover:text-[var(--rust)] font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
