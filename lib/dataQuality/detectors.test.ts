import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectStaleBooks,
  detectARIssue,
  detectStructuralNegatives,
  detectLargeSwings,
  detectSuspenseBalances,
  getDataQualityAdvisory,
} from './detectors';
import type { DataQualityInput } from './types';

function baseInput(overrides: Partial<DataQualityInput> = {}): DataQualityInput {
  return {
    lastReconciledDate: new Date(),
    currentMonthTxnCount: 100,
    trailingMedianMonthlyTxnCount: 90,
    accountsReceivable: 10_000,
    avgMonthlyRevenue: 50_000,
    arOver90Days: 1_000,
    totalEquity: 100_000,
    accumulatedDraws: 20_000,
    netMargin: 15,
    grossMargin: 40,
    priorRevenue: 100_000,
    currentRevenue: 105_000,
    priorExpenses: 80_000,
    currentExpenses: 82_000,
    priorNetIncome: 20_000,
    currentNetIncome: 23_000,
    accounts: [],
    ...overrides,
  };
}

describe('data quality detectors', () => {
  it('detectStaleBooks fires when books are 30+ days behind', () => {
    const old = new Date();
    old.setDate(old.getDate() - 60);
    const r = detectStaleBooks(baseInput({ lastReconciledDate: old }));
    assert.ok(r);
    assert.equal(r!.rule, 'stale_books');
    assert.equal(r!.priority, 1);
    assert.equal(r!.severity, 'red');
  });

  it('detectStaleBooks uses amber for 30-59 day gap', () => {
    const old = new Date();
    old.setDate(old.getDate() - 35);
    const r = detectStaleBooks(baseInput({ lastReconciledDate: old }));
    assert.ok(r);
    assert.equal(r!.severity, 'amber');
  });

  it('detectARIssue fires when AR > 2 months revenue', () => {
    const r = detectARIssue(
      baseInput({ accountsReceivable: 120_000, avgMonthlyRevenue: 50_000 })
    );
    assert.ok(r);
    assert.equal(r!.rule, 'high_ar');
  });

  it('detectStructuralNegatives fires on draw-driven negative equity', () => {
    const r = detectStructuralNegatives(
      baseInput({ totalEquity: -50_000, accumulatedDraws: 80_000 })
    );
    assert.ok(r);
    assert.equal(r!.rule, 'structural_negative');
  });

  it('detectLargeSwings fires beyond ±40%', () => {
    const r = detectLargeSwings(
      baseInput({ priorRevenue: 100_000, currentRevenue: 150_000 })
    );
    assert.ok(r);
    assert.equal(r!.rule, 'large_swing');
  });

  it('detectSuspenseBalances fires above threshold', () => {
    const r = detectSuspenseBalances(
      baseInput({
        avgMonthlyRevenue: 50_000,
        accounts: [{ name: 'Ask My Accountant', balance: 5_000 }],
      })
    );
    assert.ok(r);
    assert.equal(r!.rule, 'suspense_balances');
  });

  it('getDataQualityAdvisory skips stale_books (owned by ReconciliationBanner)', () => {
    const old = new Date();
    old.setDate(old.getDate() - 60);
    const r = getDataQualityAdvisory(
      baseInput({
        lastReconciledDate: old,
        totalEquity: -50_000,
        accumulatedDraws: 80_000,
      })
    );
    assert.ok(r);
    assert.equal(r!.rule, 'structural_negative');
  });

  it('getDataQualityAdvisory returns null for clean data', () => {
    assert.equal(getDataQualityAdvisory(baseInput()), null);
  });
});
