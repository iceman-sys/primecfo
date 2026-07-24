import type { FinancialContext } from '@/lib/ai/getFinancialContext';

/** Cash-basis + invoicing: AR-blind runway/risk actively misleads (DAI proof case). */
export function isCashBasisWithInvoicing(context: FinancialContext): boolean {
  return (
    context.derived.displayBasis === 'Cash' &&
    (context.derived.hasInvoicingActivity || (context.derived.openArTotal ?? 0) > 0)
  );
}

/** Open AR is material relative to cash (~50%+). */
export function openArMaterialVsCash(context: FinancialContext): boolean {
  const ar = context.derived.openArTotal ?? 0;
  const cash = context.summary.cash;
  if (ar <= 0) return false;
  if (cash <= 0) return ar > 100;
  return ar >= cash * 0.5;
}

export function formatMoneyShort(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}
