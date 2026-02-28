-- AI-generated plain-English insights per client (and optional period/range).
-- Used by dashboard and insights page; populated after sync or on-demand via AI API.

CREATE TABLE IF NOT EXISTS ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  period_id uuid REFERENCES financial_report_periods(id) ON DELETE SET NULL,
  report_range text,
  title text NOT NULL,
  description text NOT NULL,
  urgency text NOT NULL CHECK (urgency IN ('action_required', 'watch', 'positive', 'info')),
  category text NOT NULL,
  metric text,
  metric_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_client_id ON ai_insights (client_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_client_range ON ai_insights (client_id, report_range);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON ai_insights (client_id, created_at DESC);

COMMENT ON TABLE ai_insights IS 'AI-generated financial insights (plain-English) per client; replaced when regenerated for same client+range';
