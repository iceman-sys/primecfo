import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabasePublicConfig } from '@/lib/env';
import { secureAuthCookieOptions } from '@/lib/supabase/cookieDefaults';

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Session cookies are HttpOnly — not readable via document.cookie.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabasePublicConfig();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, secureAuthCookieOptions(options))
          );
        } catch {
          // setAll from a Server Component: ignore when middleware is refreshing sessions
        }
      },
    },
  });
}
