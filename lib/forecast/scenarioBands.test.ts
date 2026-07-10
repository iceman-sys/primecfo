import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveNetCashScenarioBands,
  medianOf,
  selectReconciledFullMonths,
} from './scenarioBands';

describe('scenarioBands', () => {
  it('medianOf handles even and odd lengths', () => {
    assert.equal(medianOf([1, 2, 3]), 2);
    assert.equal(medianOf([1, 2, 3, 4]), 2.5);
  });

  it('with 6 months uses 2nd-best / median / 2nd-worst', () => {
    // sorted: -10, 0, 5, 10, 20, 40
    const bands = deriveNetCashScenarioBands([-10, 40, 5, 20, 0, 10], 0);
    assert.equal(bands.usedDefaults, false);
    assert.equal(bands.worstMonthlyNet, 0); // 2nd-worst
    assert.equal(bands.bestMonthlyNet, 20); // 2nd-best
    assert.equal(bands.expectedMonthlyNet, 7.5); // median of 5 and 10
  });

  it('falls back when fewer than 3 samples', () => {
    const bands = deriveNetCashScenarioBands([100], 50);
    assert.equal(bands.usedDefaults, true);
    assert.equal(bands.expectedMonthlyNet, 50);
  });

  it('selectReconciledFullMonths keeps only months on/before recon date', () => {
    const recon = new Date('2026-04-30T12:00:00');
    const points = [
      { endDate: '2026-01-31', netCash: 1, ownerDraws: 0 },
      { endDate: '2026-02-28', netCash: 2, ownerDraws: 0 },
      { endDate: '2026-03-31', netCash: 3, ownerDraws: 0 },
      { endDate: '2026-04-30', netCash: 4, ownerDraws: 0 },
      { endDate: '2026-05-31', netCash: 5, ownerDraws: 0 }, // after recon
      { endDate: '2026-06-30', netCash: 6, ownerDraws: 0 },
    ];
    const selected = selectReconciledFullMonths(points, recon, 6);
    assert.deepEqual(
      selected.map((p) => p.netCash),
      [1, 2, 3, 4]
    );
  });
});
