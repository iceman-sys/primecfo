import { NextRequest, NextResponse } from 'next/server';
import { guardClientAccess } from '@/lib/auth/clientAccess';
import { loadReconciliationStatus } from '@/lib/qbo/reconciliationStatus';

/** GET /api/reconciliation/status?clientId=xxx */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  const access = await guardClientAccess(clientId);
  if (!access.ok) return access.response;

  const status = await loadReconciliationStatus(access.clientId);
  return NextResponse.json({ status });
}
