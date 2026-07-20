/**
 * Shared metric display rules — every card/insight MUST use these helpers
 * so N/A badges and denominator-near-zero % blowups cannot reappear card-by-card.
 */

/** Absolute prior values below this make % change meaningless. */
export const MATERIALITY_FLOOR_USD = 100;

/** Prior percentage-point bases below this (e.g. prior margin ~0) also skip %. */
export const MATERIALITY_FLOOR_PCT_POINTS = 1;

function fmtAbsMoney(n: number): string {
  const abs = Math.abs(n);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: abs >= 100 ? 0 : 2,
  }).format(abs);
  if (n > 0) return `+${formatted}`;
  if (n < 0) return `-${formatted.replace('-', '')}`;
  return formatted;
}

export type ChangeFormat = 'currency' | 'percentage' | 'number' | 'days' | 'text' | 'currencyExact';

/**
 * Format period-over-period change for metric badges.
 * Never returns "N/A". Below materiality floor → absolute delta; otherwise %.
 */
export function formatChange(
  current: number,
  prior: number,
  format: ChangeFormat = 'currency'
): string {
  if (!Number.isFinite(current) || !Number.isFinite(prior)) {
    return '—';
  }

  const delta = current - prior;

  if (format === 'percentage') {
    if (Math.abs(prior) < MATERIALITY_FLOOR_PCT_POINTS) {
      const sign = delta >= 0 ? '+' : '';
      return `${sign}${delta.toFixed(1)} pts`;
    }
    const pct = (delta / Math.abs(prior)) * 100;
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  }

  // Currency / number / days: floor on absolute prior
  if (Math.abs(prior) < MATERIALITY_FLOOR_USD) {
    if (format === 'days') {
      const sign = delta >= 0 ? '+' : '';
      return `${sign}${Math.round(delta)} days`;
    }
    if (format === 'number') {
      const sign = delta >= 0 ? '+' : '';
      return `${sign}${delta.toFixed(1)}`;
    }
    return fmtAbsMoney(delta);
  }

  const pct = (delta / Math.abs(prior)) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

/** Numeric % for trend arrows — 0 when materiality floor applies (treat as flat-ish). */
export function getPercentChangeSafe(current: number, prior: number, format: ChangeFormat = 'currency'): number {
  if (!Number.isFinite(current) || !Number.isFinite(prior)) return 0;
  const floor = format === 'percentage' ? MATERIALITY_FLOOR_PCT_POINTS : MATERIALITY_FLOOR_USD;
  if (Math.abs(prior) < floor) return 0;
  return ((current - prior) / Math.abs(prior)) * 100;
}

export type MetricDisplayResult = {
  /** Primary value string (never "N/A") */
  primary: string;
  /** Optional one-line explanation when the intended ratio isn't meaningful */
  explanation?: string;
  /** When true, card should be omitted from the grid */
  suppress?: boolean;
};

/**
 * Resolve a ratio metric for display. Prefer real values; never "N/A".
 * Option A: related metric · B: honest explanation · C: suppress · D: raw components
 */
export function resolveRatioMetric(opts: {
  label: string;
  /** Computed ratio (e.g. margin %). Null = cannot compute. */
  ratioPct: number | null | undefined;
  numerator?: number | null;
  denominator?: number | null;
  numeratorLabel?: string;
  denominatorLabel?: string;
  dataError?: boolean;
}): MetricDisplayResult {
  const {
    ratioPct,
    numerator,
    denominator,
    numeratorLabel = 'Net Income',
    denominatorLabel = 'Revenue',
    dataError,
  } = opts;

  const hasDenom = denominator != null && Number.isFinite(denominator) && Math.abs(denominator) > 0.005;
  const hasNum = numerator != null && Number.isFinite(numerator);

  // Prefer real ratio whenever denominator exists
  if (hasDenom && ratioPct != null && Number.isFinite(ratioPct) && !dataError) {
    return { primary: `${ratioPct.toFixed(1)}%` };
  }

  if (hasDenom && hasNum && !dataError) {
    const computed = (numerator! / denominator!) * 100;
    return { primary: `${computed.toFixed(1)}%` };
  }

  // Option D — raw components
  if (hasNum || hasDenom) {
    const parts: string[] = [];
    if (hasDenom) {
      parts.push(
        `${denominatorLabel}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(denominator!)}`
      );
    }
    if (hasNum) {
      parts.push(
        `${numeratorLabel}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(numerator!)}`
      );
    }
    return {
      primary: parts.join(' · ') || '—',
      explanation:
        !hasDenom
          ? `Not enough ${denominatorLabel.toLowerCase()} this period to calculate ${opts.label.toLowerCase()}.`
          : undefined,
    };
  }

  // Option B
  return {
    primary: '—',
    explanation: `Not enough data this period to calculate ${opts.label.toLowerCase()}.`,
  };
}
