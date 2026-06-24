import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAdminEmail } from '@/lib/auth/admin';
import { isAllowedAdminPath } from '@/lib/auth/adminRoutes';
import { applySecurityHeaders } from '@/lib/security/headers';
import { secureAuthCookieOptions } from '@/lib/supabase/cookieDefaults';

/**
 * Refreshes the Supabase auth session and updates HttpOnly cookies.
 * Used by root proxy.ts on every request so tokens stay in sync.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return applySecurityHeaders(supabaseResponse);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, secureAuthCookieOptions(options))
        );
      },
    },
  });

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith('/admin');
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/auth');

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Stale or invalid session cookie — treat as logged out.
  }

  if (user && pathname === '/signup') {
    return applySecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
  }

  if (isAdminRoute && !isAuthRoute) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }
    if (!isAdminEmail(user.email)) {
      return applySecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
    }
    if (!isAllowedAdminPath(pathname)) {
      return applySecurityHeaders(NextResponse.redirect(new URL('/admin/subscribers', request.url)));
    }
  }

  supabaseResponse.headers.set('x-pathname', pathname);
  return applySecurityHeaders(supabaseResponse);
}
