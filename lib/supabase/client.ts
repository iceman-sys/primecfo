import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicConfig } from '@/lib/env';

/**
 * Supabase client for Client Components (browser).
 * Uses the anon key; safe for Auth (sign in, sign up, sign out) and optional RLS.
 */
export function createClient() {
  const { url, key } = getSupabasePublicConfig();
  return createBrowserClient(url, key);
}
