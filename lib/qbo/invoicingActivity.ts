import { entityExists } from '@/lib/qbo/queryRunner';

/**
 * True when the company has any Invoice or Bill activity in QBO.
 * Open AR/AP (and aging reports) only matter when this is true —
 * independent of Cash vs Accrual display basis.
 */
export async function detectInvoicingActivity(clientId: string): Promise<boolean> {
  try {
    if (await entityExists(clientId, 'Invoice', 'Invoice')) return true;
  } catch (err) {
    console.warn(
      '[qbo] Invoice activity probe failed:',
      err instanceof Error ? err.message : err
    );
  }

  try {
    if (await entityExists(clientId, 'Bill', 'Bill')) return true;
  } catch (err) {
    console.warn('[qbo] Bill activity probe failed:', err instanceof Error ? err.message : err);
  }

  return false;
}
