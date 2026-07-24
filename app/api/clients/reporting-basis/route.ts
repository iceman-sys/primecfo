import { NextRequest, NextResponse } from 'next/server';
import { guardClientAccess } from '@/lib/auth/clientAccess';
import {
  isAccountingBasis,
  type AccountingBasis,
} from '@/lib/qbo/accountingBasis';
import {
  loadClientBasisSettings,
  saveReportingBasisOverride,
} from '@/lib/qbo/clientBasis';

/**
 * GET /api/clients/reporting-basis?clientId=
 * PATCH /api/clients/reporting-basis  { clientId, override: 'Cash'|'Accrual'|null }
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  const access = await guardClientAccess(clientId);
  if (!access.ok) return access.response;

  const settings = await loadClientBasisSettings(access.clientId);
  return NextResponse.json({
    qboReportBasis: settings.qboReportBasis,
    override: settings.reportingBasisOverride,
    displayBasis: settings.displayBasis,
    hasInvoicingActivity: settings.hasInvoicingActivity,
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      clientId?: string;
      override?: AccountingBasis | null | 'default';
    };
    const access = await guardClientAccess(body.clientId);
    if (!access.ok) return access.response;

    let override: AccountingBasis | null = null;
    if (body.override === 'default' || body.override === null || body.override === undefined) {
      override = null;
    } else if (isAccountingBasis(body.override)) {
      override = body.override;
    } else {
      return NextResponse.json(
        { error: 'override must be Cash, Accrual, or default' },
        { status: 400 }
      );
    }

    await saveReportingBasisOverride(access.clientId, override);
    const settings = await loadClientBasisSettings(access.clientId);
    return NextResponse.json({
      ok: true,
      qboReportBasis: settings.qboReportBasis,
      override: settings.reportingBasisOverride,
      displayBasis: settings.displayBasis,
      hasInvoicingActivity: settings.hasInvoicingActivity,
      notice:
        'Re-run Sync so P&L and balance sheet refresh on the selected basis.',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update reporting basis' },
      { status: 500 }
    );
  }
}
