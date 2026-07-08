type QboColumnMeta = { Name?: string; Value?: string };

type QboColumn = {
  ColTitle?: { value?: string };
  ColType?: string;
  MetaData?: QboColumnMeta[];
};

function formatShortDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatRangeLabel(start: string, end: string): string {
  const s = new Date(`${start.slice(0, 10)}T12:00:00`);
  const e = new Date(`${end.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    return formatShortDate(start);
  }
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return s.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  const sameYear = s.getFullYear() === e.getFullYear();
  const startFmt = s.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const endFmt = e.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startFmt} – ${endFmt}`;
}

/** Resolve a human-readable period label from a QBO report column definition. */
export function columnPeriodLabel(col: QboColumn): string {
  const title = (col.ColTitle?.value ?? '').trim();
  if (title && title !== '—' && title !== '-') return title;

  const meta = col.MetaData;
  if (Array.isArray(meta)) {
    const start = meta.find((m) => m.Name === 'StartDate')?.Value;
    const end = meta.find((m) => m.Name === 'EndDate')?.Value;
    if (start && end) return formatRangeLabel(start, end);
    if (start) return formatShortDate(start);
    if (end) return formatShortDate(end);
  }

  const colType = (col.ColType ?? '').trim();
  if (/^total$/i.test(colType)) return 'Total';

  return '';
}

export function extractColumnPeriodLabels(
  columns: QboColumn[] | undefined,
  fallback = '—'
): string[] {
  if (!Array.isArray(columns) || columns.length < 2) return [];
  return columns.slice(1).map((c) => columnPeriodLabel(c) || fallback);
}
