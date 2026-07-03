import { NextRequest, NextResponse } from 'next/server';
import { guardClientAccess } from '@/lib/auth/clientAccess';
import { loadDataQualityAdvisory } from '@/lib/dataQuality';
import type { ReportRange } from '@/lib/qbo/reports';

/**
 * GET /api/data-quality/advisory?clientId=xxx&range=12m
 * Returns the highest-priority data-quality advisory for the dashboard view, or null.
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  const range = (request.nextUrl.searchParams.get('range') ?? '12m') as ReportRange;

  const access = await guardClientAccess(clientId);
  if (!access.ok) return access.response;

  const advisory = await loadDataQualityAdvisory(access.clientId, range);
  return NextResponse.json({ advisory });
}
