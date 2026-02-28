import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';

export type ConnectionStatus = 'connected' | 'disconnected' | 'needs_reauth' | 'error';

export type ConnectionStatusResponse = {
  status: ConnectionStatus;
  lastSyncAt: string | null;
  expirationTime: string | null;
  lastError?: string | null;
};

/**
 * GET /api/quickbooks/connection?clientId=xxx
 * Returns QuickBooks connection status for the client (no tokens).
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('quickbooks_connections')
    .select('status, updated_at, access_expires_at, last_refresh_error')
    .eq('client_id', clientId)
    .maybeSingle();

  if (error) {
    console.error('QuickBooks connection status error:', error);
    return NextResponse.json(
      { status: 'error', lastSyncAt: null, expirationTime: null } as ConnectionStatusResponse,
      { status: 200 }
    );
  }

  if (!data) {
    return NextResponse.json({
      status: 'disconnected',
      lastSyncAt: null,
      expirationTime: null,
    } as ConnectionStatusResponse);
  }

  const row = data as {
    status: string | null;
    updated_at: string | null;
    access_expires_at: string | null;
    last_refresh_error: string | null;
  };

  let status: ConnectionStatus = 'connected';
  if (row.status === 'needs_reauth') status = 'needs_reauth';
  else if (row.status !== 'connected') status = 'error';

  return NextResponse.json({
    status,
    lastSyncAt: row.updated_at ?? null,
    expirationTime: row.access_expires_at ?? null,
    lastError: row.last_refresh_error ?? undefined,
  } as ConnectionStatusResponse);
}
