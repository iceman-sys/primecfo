import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';

/**
 * POST /api/quickbooks/disconnect
 * Disconnects QuickBooks for the given client: removes tokens and marks connection as disconnected.
 * Body: { "clientId": "uuid" } or query: ?clientId=uuid
 */
export async function POST(request: NextRequest) {
  let clientId: string | null = null;

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const body = await request.json();
      clientId = (body.clientId ?? body.client_id ?? '').trim() || null;
    } catch {
      // ignore
    }
  }
  if (!clientId) {
    clientId = request.nextUrl.searchParams.get('clientId')?.trim() ?? null;
  }

  if (!clientId) {
    return NextResponse.json(
      { error: 'clientId is required' },
      { status: 400 }
    );
  }

  const sb = supabaseAdmin();

  // 1) Remove token row so no further API calls can use this connection
  const { error: deleteConnError } = await sb
    .from('quickbooks_connections')
    .delete()
    .eq('client_id', clientId);

  if (deleteConnError) {
    console.error('QuickBooks disconnect: quickbooks_connections delete error', deleteConnError);
    return NextResponse.json(
      { error: 'Failed to disconnect QuickBooks' },
      { status: 500 }
    );
  }

  // 2) Mark client_qbo_connections as disconnected so dashboard/API show disconnected
  const { error: updateQboError } = await sb
    .from('client_qbo_connections')
    .update({ status: 'disconnected' })
    .eq('client_id', clientId);

  if (updateQboError) {
    console.error('QuickBooks disconnect: client_qbo_connections update error', updateQboError);
    // Token is already removed; still return success so UI can refresh
  }

  return NextResponse.json({ success: true, disconnected: true });
}
