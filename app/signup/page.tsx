'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Lock, Mail, CheckCircle } from 'lucide-react';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const baseUrl =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_URL ?? '';

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
        <header className="border-b border-white/10 px-6 py-4">
          <nav className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-semibold tracking-tight">
                <span className="text-emerald-400">P</span>rimeCFO.ai
              </span>
            </Link>
          </nav>
        </header>
        <main className="max-w-md mx-auto px-6 py-20 flex-1 flex flex-col justify-center">
          <div className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Check your email</h1>
            <p className="text-white/60 text-sm mb-6">
              We sent a confirmation link to <strong className="text-white/80">{email}</strong>.
              Click the link to confirm your account and sign in.
            </p>
            <p className="text-white/50 text-xs mb-6">
              If you don’t see it, check your spam folder or wait a few minutes.
            </p>
            <Link
              href="/login"
              className="inline-block text-emerald-400 hover:text-emerald-300 text-sm font-medium"
            >
              Go to sign in →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      <header className="border-b border-white/10 px-6 py-4">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight">
              <span className="text-emerald-400">P</span>rimeCFO.ai
            </span>
          </Link>
          <Link
            href="/login"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Already have an account? Sign in
          </Link>
        </nav>
      </header>

      <main className="max-w-md mx-auto px-6 py-16 flex-1 flex flex-col justify-center">
        <div className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl p-8">
          <div className="w-14 h-14 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-center mb-2">Create an account</h1>
          <p className="text-white/60 text-center text-sm mb-6">
            Sign up with your email. You’ll need to confirm it before signing in.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/80 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  placeholder="Repeat password"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-medium text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#0a0a0f] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-xs text-white/40 text-center">
            By signing up, you agree to our{' '}
            <Link href="/eula" className="underline hover:text-white/60">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline hover:text-white/60">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
