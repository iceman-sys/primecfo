'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function DisconnectQuickBooksContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId')?.trim() ?? null;
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisconnect = async () => {
    if (!clientId) {
      setError('No client specified. Use the Connect page to disconnect, or add ?clientId=... to this URL.');
      return;
    }
    setError(null);
    setIsDisconnecting(true);
    try {
      const res = await fetch('/api/quickbooks/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Failed to disconnect');
        return;
      }
      setIsDisconnected(true);
    } catch (e) {
      console.error('Disconnect failed:', e);
      setError(e instanceof Error ? e.message : 'Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight">
              <span className="text-emerald-400">P</span>rimeCFO.ai
            </span>
          </Link>
          <Link 
            href="https://primecfo.ai" 
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            ← Back to PrimeCFO
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl p-8 md:p-12">
          
          {isDisconnected ? (
            // Success State
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h1 className="text-2xl font-semibold text-center mb-3">
                Successfully Disconnected
              </h1>
              
              <p className="text-white/60 text-center mb-8 leading-relaxed">
                Your QuickBooks Online account has been disconnected from PrimeCFO. 
                We have revoked access and will no longer sync your financial data.
              </p>

              <div className="space-y-3">
                <Link
                  href="/connect"
                  className="w-full py-3 px-6 rounded-xl font-medium text-white bg-[#2CA01C] hover:bg-[#248516] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  Reconnect QuickBooks
                </Link>
                
                <Link
                  href="/"
                  className="w-full py-3 px-6 rounded-xl font-medium text-white/70 bg-white/5 hover:bg-white/10 transition-all duration-200 flex items-center justify-center"
                >
                  Return to Dashboard
                </Link>
              </div>
            </>
          ) : (
            // Disconnect Confirmation
            <>
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h1 className="text-2xl font-semibold text-center mb-3">
                Disconnect QuickBooks
              </h1>
              
              <p className="text-white/60 text-center mb-8 leading-relaxed">
                Are you sure you want to disconnect your QuickBooks Online account from PrimeCFO?
              </p>

              {error && (
                <p className="text-red-400 text-sm text-center mb-4">{error}</p>
              )}
              {!clientId && !error && (
                <p className="text-amber-400/90 text-sm text-center mb-4">
                  Open the <Link href="/connect" className="underline hover:text-amber-300">Connect</Link> page after logging in to disconnect, or add <code className="bg-white/10 px-1 rounded">?clientId=your-client-id</code> to this URL.
                </p>
              )}

              {/* What happens section */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 mb-8">
                <p className="text-sm font-medium mb-3">What happens when you disconnect:</p>
                <ul className="space-y-2 text-sm text-white/60">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 mt-1.5 flex-shrink-0"></span>
                    PrimeCFO will no longer have access to your QuickBooks data
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 mt-1.5 flex-shrink-0"></span>
                    Real-time syncing and financial analysis will stop
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 mt-1.5 flex-shrink-0"></span>
                    You can reconnect at any time to restore access
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting || !clientId}
                  className="w-full py-3 px-6 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isDisconnecting ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Yes, Disconnect QuickBooks
                    </>
                  )}
                </button>
                
                <Link
                  href="/"
                  className="w-full py-3 px-6 rounded-xl font-medium text-white/70 bg-white/5 hover:bg-white/10 transition-all duration-200 flex items-center justify-center"
                >
                  Cancel
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Help Links */}
        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-white/40">
          <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
          <span>•</span>
          <Link href="/eula" className="hover:text-white/60 transition-colors">Terms of Service</Link>
          <span>•</span>
          <span>Need Help? primecfoaidev@gmail.com</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-6 mt-20">
        <div className="max-w-6xl mx-auto text-center text-xs text-white/40">
          © 2025 Prime Accounting Solutions, LLC. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default function DisconnectQuickBooks() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    }>
      <DisconnectQuickBooksContent />
    </Suspense>
  );
}