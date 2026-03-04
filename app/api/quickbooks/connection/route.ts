import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { proactivelyRefreshIfNeeded } from '@/lib/qbo/tokens';
import { syncConnectionStatus } from '@/lib/qbo/syncConnectionStatus';

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
 * Proactively refreshes the token if it is expiring soon, and keeps
 * quickbooks_connections + client_qbo_connections in sync.
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const sb = supabaseAdmin();

  // Attempt proactive refresh so the token stays valid between API calls.
  // On failure, getValidQuickBooksAccessToken updates status to needs_reauth.
  try {
    await proactivelyRefreshIfNeeded(clientId);
  } catch {
    // Status already updated inside the refresh path; continue to read fresh status below.
  }

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
    await syncConnectionStatus(clientId, 'disconnected').catch(() => {});
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

  // Keep client_qbo_connections in sync with the real status
  if (status !== 'connected') {
    await syncConnectionStatus(
      clientId,
      status === 'needs_reauth' ? 'needs_reauth' : 'disconnected',
      row.last_refresh_error ?? undefined
    ).catch(() => {});
  }

  return NextResponse.json({
    status,
    lastSyncAt: row.updated_at ?? null,
    expirationTime: row.access_expires_at ?? null,
    lastError: row.last_refresh_error ?? undefined,
  } as ConnectionStatusResponse);
}
