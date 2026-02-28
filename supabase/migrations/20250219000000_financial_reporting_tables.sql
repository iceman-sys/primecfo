-- Financial reporting: periods, raw reports from QuickBooks, and normalized metrics.

CREATE TABLE IF NOT EXISTS financial_report_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('month', 'quarter')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  label text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_financial_report_periods_client_id
  ON financial_report_periods (client_id);
CREATE INDEX IF NOT EXISTS idx_financial_report_periods_dates
  ON financial_report_periods (client_id, start_date, end_date);

CREATE TABLE IF NOT EXISTS financial_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('pnl', 'balance_sheet', 'cash_flow', 'ar_aging', 'ap_aging', 'coa')),
  period_id uuid NOT NULL REFERENCES financial_report_periods(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'quickbooks',
  raw_json jsonb NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, report_type, period_id)
);

CREATE INDEX IF NOT EXISTS idx_financial_reports_client_id
  ON financial_reports (client_id);
CREATE INDEX IF NOT EXISTS idx_financial_reports_period_id
  ON financial_reports (period_id);
CREATE INDEX IF NOT EXISTS idx_financial_reports_type_period
  ON financial_reports (client_id, report_type, period_id);

CREATE TABLE IF NOT EXISTS financial_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  period_id uuid NOT NULL REFERENCES financial_report_periods(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL CHECK (unit IN ('currency', 'ratio', 'count')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_metrics_client_period
  ON financial_metrics (client_id, period_id);
CREATE INDEX IF NOT EXISTS idx_financial_metrics_key
  ON financial_metrics (client_id, period_id, metric_key);

COMMENT ON TABLE financial_report_periods IS 'Reporting periods (month/quarter) for stored reports';
COMMENT ON TABLE financial_reports IS 'Report metadata + raw JSON from QuickBooks (or other source)';
COMMENT ON TABLE financial_metrics IS 'Normalized metrics derived from reports';