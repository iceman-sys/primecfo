import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  basisLabel,
  normalizeAccountingBasis,
  resolveDisplayBasis,
} from './accountingBasis';

describe('accountingBasis', () => {
  it('normalizes Cash / Accrual', () => {
    assert.equal(normalizeAccountingBasis('cash'), 'Cash');
    assert.equal(normalizeAccountingBasis('Accrual'), 'Accrual');
    assert.equal(normalizeAccountingBasis('other'), null);
  });

  it('prefers Settings override over QBO default', () => {
    assert.equal(
      resolveDisplayBasis({ qboReportBasis: 'Cash', override: 'Accrual' }),
      'Accrual'
    );
    assert.equal(
      resolveDisplayBasis({ qboReportBasis: 'Accrual', override: null }),
      'Accrual'
    );
    assert.equal(resolveDisplayBasis({}), 'Cash');
  });

  it('formats provenance label', () => {
    assert.equal(basisLabel('Cash'), 'Basis: Cash');
    assert.equal(basisLabel('Accrual'), 'Basis: Accrual');
  });
});
