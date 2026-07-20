import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatChange,
  resolveRatioMetric,
  MATERIALITY_FLOOR_USD,
} from './displayRules';

describe('displayRules', () => {
  it('never returns N/A for tiny prior cash — shows absolute delta', () => {
    const s = formatChange(-2804.89, 3.27, 'currencyExact');
    assert.equal(s.includes('N/A'), false);
    assert.ok(s.includes('$'), `expected money delta, got ${s}`);
    assert.ok(Math.abs(3.27) < MATERIALITY_FLOOR_USD);
  });

  it('shows percent when prior is material', () => {
    const s = formatChange(2000, 1000, 'currency');
    assert.equal(s, '+100.0%');
  });

  it('resolves negative profit margin when revenue exists', () => {
    const r = resolveRatioMetric({
      label: 'Profit Margin',
      ratioPct: -22.2,
      numerator: -2805,
      denominator: 12600,
    });
    assert.equal(r.primary, '-22.2%');
  });

  it('falls back to components when revenue is zero', () => {
    const r = resolveRatioMetric({
      label: 'Profit Margin',
      ratioPct: null,
      numerator: -2805,
      denominator: 0,
    });
    assert.equal(r.primary.includes('N/A'), false);
    assert.ok(r.explanation || r.primary.includes('Net Income'));
  });
});
