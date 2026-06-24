import type { CookieOptions } from '@supabase/ssr';

/** HttpOnly session cookies — tokens are not readable via document.cookie. */
export function secureAuthCookieOptions(overrides?: CookieOptions): CookieOptions {
  return {
    ...overrides,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}
