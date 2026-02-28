-- Ensure one row per (client_id, period_id, metric_key) for upserts.
-- Remove duplicates keeping the latest created_at row, then add unique constraint.
DELETE FROM financial_metrics a
USING financial_metrics b
WHERE a.id < b.id
  AND a.client_id = b.client_id
  AND a.period_id = b.period_id
  AND a.metric_key = b.metric_key;

ALTER TABLE financial_metrics
  ADD CONSTRAINT financial_metrics_client_period_key_key
  UNIQUE (client_id, period_id, metric_key);
