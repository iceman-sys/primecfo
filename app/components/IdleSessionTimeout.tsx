'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/** Idle session timeout — 20 minutes of no user activity. */
const IDLE_MS = 20 * 60 * 1000;
const WINDOW_ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
] as const satisfies ReadonlyArray<keyof WindowEventMap>;

/**
 * Signs the user out after IDLE_MS of inactivity on authenticated surfaces.
 * Required for a financial-data product before cold launch.
 */
export default function IdleSessionTimeout() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signingOut = useRef(false);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const signOutIdle = async () => {
      if (signingOut.current) return;
      signingOut.current = true;
      try {
        await fetch('/api/auth/signout', { method: 'POST' });
      } catch {
        /* still redirect */
      }
      router.replace('/login?reason=idle');
    };

    const arm = () => {
      if (document.visibilityState === 'hidden') return;
      clearTimer();
      timerRef.current = setTimeout(() => {
        void signOutIdle();
      }, IDLE_MS);
    };

    const onActivity = () => {
      if (document.visibilityState === 'hidden') return;
      arm();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') arm();
    };

    arm();
    for (const evt of WINDOW_ACTIVITY_EVENTS) {
      window.addEventListener(evt, onActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimer();
      for (const evt of WINDOW_ACTIVITY_EVENTS) {
        window.removeEventListener(evt, onActivity);
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [router]);

  return null;
}
