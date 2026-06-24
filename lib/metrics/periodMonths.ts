import type { ReportRange } from '@/lib/qbo/reports';

export function periodMonthsForRange(range: ReportRange): number {
  if (range === '3m') return 3;
  if (range === '6m') return 6;
  if (range === '4q') return 12;
  return 12;
}
