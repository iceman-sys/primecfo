import { NextRequest, NextResponse } from 'next/server';
import { getRefreshCronSecret } from '@/lib/qbo/env';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { getValidAccessTokenForClient } from '@/lib/qbo/tokens';

// Optional automation endpoint (Vercel Cron / external scheduler):
// - Call: GET /api/quickbooks/refresh?secret=...
// - Or:  Authorization: Bearer <secret>
// Refreshes tokens that are expired or expiring soon when they’re next used.
// This endpoint can proactively touch connections so refresh happens before dashboard usage.

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const secret = request.nextUrl.searchParams.get('secret');
  const expected = getRefreshCronSecret();

  const bearer = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
  if ((bearer || secret) !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const now = Date.now();
  const horizonMs = 10 * 60 * 1000; // 10 minutes
  const horizonIso = new Date(now + horizonMs).toISOString();

  const [connRes, tokenRes] = await Promise.all([
    sb.from('quickbooks_connections').select('client_id').eq('status', 'connected').not('access_expires_at', 'is', null).lte('access_expires_at', horizonIso),
    sb.from('qbo_tokens').select('client_id').not('expires_at', 'is', null).lte('expires_at', horizonIso),
  ]);

  if (connRes.error && tokenRes.error) {
    return NextResponse.json({ error: connRes.error.message || tokenRes.error.message }, { status: 500 });
  }

  const connIds = (connRes.data || []).map((r: { client_id?: string }) => r.client_id).filter(Boolean) as string[];
  const tokenIds = (tokenRes.data || []).map((r: { client_id?: string }) => r.client_id).filter(Boolean) as string[];
  const clientIds = Array.from(new Set([...connIds, ...tokenIds]));
  const results: Array<{ clientId: string; ok: boolean; error?: string }> = [];

  // Small sequential loop to avoid hammering Intuit rate limits.
  for (const clientId of clientIds) {
    try {
      await getValidAccessTokenForClient(clientId);
      results.push({ clientId, ok: true });
    } catch (e) {
      results.push({ clientId, ok: false, error: e instanceof Error ? e.message : 'Unknown error' });
    }
  }

  return NextResponse.json({
    refreshedCandidates: clientIds.length,
    results,
  });
}

