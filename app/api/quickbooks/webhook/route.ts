import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { safeEqual } from '@/lib/qbo/crypto';
import { getWebhookSyncTriggerUrl, getWebhookVerifierToken } from '@/lib/qbo/env';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';

function computeIntuitSignature(rawBody: string, verifierToken: string): string {
  const hmac = crypto.createHmac('sha256', verifierToken);
  hmac.update(rawBody, 'utf8');
  return hmac.digest('base64');
}

/** GET: health check so Intuit / you can confirm the endpoint is deployed. */
export async function GET() {
  return NextResponse.json({ ok: true });
}

/**
 * POST: receive QuickBooks webhook events.
 * - Verifies authenticity via intuit-signature (HMAC-SHA256 with verifier token); rejects invalid.
 * - Stores payload in qbo_webhook_receipts with processing_status = 'pending'.
 * - Optionally triggers sync job when QBO_WEBHOOK_SYNC_TRIGGER_URL is set.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const headerSignature = request.headers.get('intuit-signature');

  if (!headerSignature) {
    return NextResponse.json({ error: 'Missing intuit-signature header' }, { status: 400 });
  }

  const verifierToken = getWebhookVerifierToken();
  if (!verifierToken) {
    console.warn('QBO webhook: QBO_WEBHOOK_VERIFIER_TOKEN not set; rejecting payload');
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 503 }
    );
  }

  const computed = computeIntuitSignature(rawBody, verifierToken);
  if (!safeEqual(headerSignature, computed)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: unknown = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: row, error: insertError } = await sb
    .from('qbo_webhook_receipts')
    .insert({
      intuit_signature: headerSignature,
      payload,
      processing_status: 'pending',
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('QBO webhook: failed to store receipt', insertError);
    return NextResponse.json(
      { error: 'Failed to store webhook receipt' },
      { status: 500 }
    );
  }

  const syncTriggerUrl = getWebhookSyncTriggerUrl();
  if (syncTriggerUrl && row?.id) {
    fetch(syncTriggerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptId: row.id, source: 'qbo_webhook' }),
    }).catch((e) => console.warn('QBO webhook: sync trigger request failed', e));
  }

  return NextResponse.json({ ok: true, receiptId: row?.id });
}

