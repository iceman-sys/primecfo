import { NextRequest, NextResponse } from 'next/server';
import { guardClientAccess } from '@/lib/auth/clientAccess';
import { fetchFixedAssetAccounts } from '@/lib/qbo/queryRunner';
import { getValidQuickBooksAccessToken } from '@/lib/qbo/tokens';

/**
 * GET /api/assets?clientId=xxx
 * Fixed assets from QBO Chart of Accounts (AccountType = Fixed Asset).
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  const access = await guardClientAccess(clientId);
  if (!access.ok) return access.response;

  try {
    await getValidQuickBooksAccessToken(access.clientId);
  } catch {
    return NextResponse.json({
      hasData: false,
      error: 'QuickBooks is not connected. Connect QuickBooks to view assets.',
      assets: [],
    });
  }

  try {
    const accounts = await fetchFixedAssetAccounts(access.clientId);
    const assets = accounts.map((a) => ({
      id: a.id,
      name: a.name,
      category: a.accountSubType || 'Fixed Asset',
      currentValue: a.balance,
      originalCost: a.balance,
      status: a.active ? ('active' as const) : ('inactive' as const),
    }));

    return NextResponse.json({
      hasData: assets.length > 0,
      assets,
      error: assets.length === 0 ? 'No fixed asset accounts found in QuickBooks.' : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load assets';
    return NextResponse.json({ hasData: false, error: msg, assets: [] }, { status: 500 });
  }
}
