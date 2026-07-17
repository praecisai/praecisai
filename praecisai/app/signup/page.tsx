'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';
import api from '../../lib/api/client';
import { Logo } from '../components/landing/Logo';
import { IconArrowLeft } from '@tabler/icons-react';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();

    // 1. Create Supabase auth user
    const { data, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError || !data.user) {
      setError(authError?.message ?? 'Signup failed');
      setLoading(false);
      return;
    }

    // 2. Onboard: create business + user record
    try {
      await api.post('/auth/onboard', { businessName });
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
      className="min-h-screen flex items-center justify-center px-5 py-10 relative"
      style={{ background: 'var(--cream)' }}
    >
      <Link 
        href="/" 
        className="absolute top-6 left-6 flex items-center gap-2 font-body text-sm font-medium text-[var(--walnut)] hover:text-[var(--mahogany)] transition-colors"
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

        <div className="glass-card p-8">
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
