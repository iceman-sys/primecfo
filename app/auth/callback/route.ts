import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /auth/callback
 * Supabase redirects here after email confirmation (or magic link) with ?code=...
 * We exchange the code for a session and set cookies, then redirect.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('Auth callback exchange error:', error);
    return NextResponse.redirect(`${requestUrl.origin}/login?error=callback_failed`);
  }

  const redirectPath = next.startsWith('/') ? next : `/${next}`;
  return NextResponse.redirect(`${requestUrl.origin}${redirectPath}`);
}
