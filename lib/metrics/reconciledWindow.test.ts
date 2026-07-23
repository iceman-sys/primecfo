import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatReconciledWindowLabel,
  selectReconciledWindow,
} from './reconciledWindow';

describe('reconciledWindow', () => {
  it('formats Mar–May style label', () => {
    const label = formatReconciledWindowLabel([
      { start_date: '2026-03-01', end_date: '2026-03-31' },
      { start_date: '2026-04-01', end_date: '2026-04-30' },
      { start_date: '2026-05-01', end_date: '2026-05-31' },
    ]);
    assert.equal(label, 'Showing Mar–May 2026 · reconciled');
  });

  it('anchors when calendar window has incomplete months', () => {
    const all = [
      { id: '1', end_date: '2026-03-31' },
      { id: '2', end_date: '2026-04-30' },
      { id: '3', end_date: '2026-05-31' },
      { id: '4', end_date: '2026-06-30' },
      { id: '5', end_date: '2026-07-31' },
    ];
    const calendar = all.slice(2); // May–Jul
    const recon = new Date('2026-05-31T23:59:59');
    const isComplete = (end: string, r: Date) => new Date(`${end}T23:59:59`) <= r;
    const { window, anchored } = selectReconciledWindow(all, calendar, 3, recon, isComplete);
    assert.equal(anchored, true);
    assert.deepEqual(
      window.map((p) => p.id),
      ['1', '2', '3']
    );
  });
});
