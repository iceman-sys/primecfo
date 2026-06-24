'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail } from 'lucide-react';

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: 'Confirmation link was invalid or expired. Please sign up again or request a new link.',
  callback_failed: 'We couldn’t complete sign in. Please try again or use the link from your email.',
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const signupSuccess = searchParams.get('signup') === 'success';

  const redirectAfterAuth = () => {
    const next = searchParams.get('next') ?? '/dashboard';
    const path = next.startsWith('/') ? next : `/${next}`;
    router.push(path);
    router.refresh();
  };

  useEffect(() => {
    const errorCode = searchParams.get('error');
    if (errorCode && ERROR_MESSAGES[errorCode]) {
      setError(ERROR_MESSAGES[errorCode]);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        mfaRequired?: boolean;
        factorId?: string;
      };

      if (!res.ok) {
        setError(data.error ?? 'Sign in failed');
        setLoading(false);
        return;
      }

      if (data.mfaRequired && data.factorId) {
        setMfaFactorId(data.factorId);
        setLoading(false);
        return;
      }

      redirectAfterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!mfaFactorId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId: mfaFactorId, code: mfaCode }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Verification failed');
        setLoading(false);
        return;
      }
      redirectAfterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

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
            href="/signup"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Create an account
          </Link>
        </nav>
      </header>

      <main className="max-w-md mx-auto px-6 py-16 flex-1 flex flex-col justify-center">
        <div className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl p-8">
          <div className="w-14 h-14 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-center mb-2">
            {mfaFactorId ? 'Two-factor verification' : 'Sign in'}
          </h1>
          <p className="text-white/60 text-center text-sm mb-6">
            {mfaFactorId
              ? 'Enter the 6-digit code from your authenticator app.'
              : 'Use the email and password you signed up with.'}
          </p>

          {mfaFactorId ? (
            <form onSubmit={handleVerifyMfa} className="space-y-4">
              <div>
                <label htmlFor="mfaCode" className="block text-sm font-medium text-white/80 mb-1.5">
                  Authentication code
                </label>
                <input
                  id="mfaCode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-center text-lg tracking-[0.4em] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  placeholder="000000"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || mfaCode.length < 6}
                className="w-full py-3 px-4 rounded-xl font-medium text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#0a0a0f] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Verifying…' : 'Verify & sign in'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMfaFactorId(null);
                  setMfaCode('');
                  setError('');
                }}
                className="w-full text-center text-sm text-white/50 hover:text-white/80 transition-colors"
              >
                Back to sign in
              </button>
            </form>
          ) : (
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  placeholder="Your password"
                />
              </div>
            </div>

            {signupSuccess && !error && (
              <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                Account created. Sign in with your email and password.
              </p>
            )}

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
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          )}

          {!mfaFactorId && (
            <p className="mt-6 text-center text-sm text-white/50">
              Don’t have an account?{' '}
              <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 font-medium">
                Sign up
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
