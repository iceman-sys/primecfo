'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AdminAuthProps {
  children: React.ReactNode;
}

type MeResponse = { isAdmin?: boolean; isOperator?: boolean };

/**
 * Client-side guard for /admin pages. Server layout + proxy also enforce ADMIN_EMAILS.
 */
export default function AdminAuth({ children }: AdminAuthProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          const next =
            typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname) : '';
          router.replace(next ? `/login?next=${next}` : '/login');
          setIsLoading(false);
          return;
        }

        const me = (await res.json()) as MeResponse;
        const isAdmin = !!(me.isAdmin ?? me.isOperator);
        if (!isAdmin) {
          router.replace('/dashboard');
          setIsLoading(false);
          return;
        }
        setAllowed(true);
        setIsLoading(false);
      })
      .catch(() => {
        router.replace('/dashboard');
        setIsLoading(false);
      });
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
