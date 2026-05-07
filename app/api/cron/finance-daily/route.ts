import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/cron/finance-daily — optional scheduled job guard.
 * Set CRON_SECRET in env and send header: Authorization: Bearer <secret>
 *
 * Intended to be wired to evaluate alerts daily (QBO nightly sync assumed separate).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 501 });
  }
  const auth = request.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    message:
      'Cron guard is active. Hook this route to your scheduler to call /api/alerts?clientId=…&evaluate=1 per company.',
  });
}
