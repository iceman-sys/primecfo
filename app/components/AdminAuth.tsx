'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface AdminAuthProps {
  children: React.ReactNode;
}

/**
 * Wraps admin content and ensures the user has a Supabase session.
 * If not signed in, redirects to /login. The proxy also protects /admin server-side.
 */
export default function AdminAuth({ children }: AdminAuthProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
      } else {
        const next = typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname) : '';
        router.replace(next ? `/login?next=${next}` : '/login');
      }
      setIsLoading(false);
    });
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!hasSession) {
    return null;
  }

  return <>{children}</>;
}
