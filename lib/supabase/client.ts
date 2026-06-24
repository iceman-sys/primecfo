import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicConfig } from '@/lib/env';

/**
 * Supabase browser client — avoid for auth (use /api/auth/* so session cookies stay HttpOnly).
 * Safe for optional client-side reads when RLS permits.
 */
export function createClient() {
  const { url, key } = getSupabasePublicConfig();
  return createBrowserClient(url, key);
}
