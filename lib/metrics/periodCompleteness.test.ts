import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isCurrentPeriodIncomplete,
  shouldSuppressMetric,
} from './periodCompleteness';

describe('periodCompleteness', () => {
  it('flags near-zero current revenue against material prior', () => {
    assert.equal(
      isCurrentPeriodIncomplete({ currentRevenue: 0, priorRevenue: 12_600 }),
      true
    );
  });

  it('does not flag healthy period-over-period revenue', () => {
    assert.equal(
      isCurrentPeriodIncomplete({ currentRevenue: 11_000, priorRevenue: 12_600 }),
      false
    );
  });

  it('flags steep collapse below 5% of prior', () => {
    assert.equal(
      isCurrentPeriodIncomplete({ currentRevenue: 400, priorRevenue: 12_600 }),
      true
    );
  });

  it('suppresses revenue-dependent metrics when incomplete', () => {
    assert.equal(shouldSuppressMetric('revenueTrend', true), true);
    assert.equal(shouldSuppressMetric('currentRatio', true), true);
    assert.equal(shouldSuppressMetric('cashPosition', true), false);
    assert.equal(shouldSuppressMetric('revenueTrend', false), false);
  });
});
