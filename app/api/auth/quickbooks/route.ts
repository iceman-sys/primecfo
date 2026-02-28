import { NextRequest, NextResponse } from 'next/server';
import { getPublicBaseUrl } from '@/lib/qbo/env';

/**
 * GET /api/auth/quickbooks
 * Entry point for "Connect QuickBooks" from /connect page or links.
 * - If clientId is provided: redirects to /api/quickbooks/auth (OAuth start).
 * - Otherwise: redirects to dashboard with ?connect=qbo so user can select a client and connect.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('clientId');
  const returnTo = searchParams.get('returnTo') || 'connect';

  const baseUrl = getPublicBaseUrl();

  if (clientId) {
    const authUrl = `${baseUrl}/api/quickbooks/auth?clientId=${encodeURIComponent(clientId)}&returnTo=${encodeURIComponent(returnTo)}`;
    return NextResponse.redirect(authUrl);
  }

  return NextResponse.redirect(`${baseUrl}/dashboard?connect=qbo`);
}
