-- financial_report_periods: one row per (client_id, period_type, start_date, end_date).
ALTER TABLE financial_report_periods
  DROP CONSTRAINT IF EXISTS financial_report_periods_client_period_dates_key;

ALTER TABLE financial_report_periods
  ADD CONSTRAINT financial_report_periods_client_period_dates_key
  UNIQUE (client_id, period_type, start_date, end_date);
