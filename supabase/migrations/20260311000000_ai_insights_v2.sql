-- AI Insights v2: severity tiering, recommendations, talking points, risk posture.

-- 1. Add new columns to ai_insights
ALTER TABLE ai_insights
  ADD COLUMN IF NOT EXISTS recommendations jsonb,
  ADD COLUMN IF NOT EXISTS talking_points jsonb,
  ADD COLUMN IF NOT EXISTS severity_order int NOT NULL DEFAULT 4;

-- 2. Migrate existing action_required rows to critical BEFORE changing the constraint
UPDATE ai_insights SET urgency = 'critical', severity_order = 0 WHERE urgency = 'action_required';

-- 3. Drop old urgency CHECK (may be auto-named) and add new one
ALTER TABLE ai_insights DROP CONSTRAINT IF EXISTS ai_insights_urgency_check;
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'ai_insights'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%action_required%'
  LIMIT 1;
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE ai_insights DROP CONSTRAINT %I', cname);
  END IF;
END $$;
ALTER TABLE ai_insights
  ADD CONSTRAINT ai_insights_urgency_check
    CHECK (urgency IN ('critical', 'warning', 'watch', 'positive', 'info'));

-- 4. Backfill severity_order for existing rows
UPDATE ai_insights SET severity_order = 0 WHERE urgency = 'critical'   AND severity_order = 4;
UPDATE ai_insights SET severity_order = 1 WHERE urgency = 'warning'    AND severity_order = 4;
UPDATE ai_insights SET severity_order = 2 WHERE urgency = 'watch'      AND severity_order = 4;
UPDATE ai_insights SET severity_order = 3 WHERE urgency = 'positive'   AND severity_order = 4;
-- info stays at 4 (the default)

-- 5. Index for severity-ordered queries
CREATE INDEX IF NOT EXISTS idx_ai_insights_severity ON ai_insights (client_id, report_range, severity_order);

-- 6. Risk posture aggregate table
CREATE TABLE IF NOT EXISTS ai_risk_posture (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  report_range text NOT NULL,
  rating text NOT NULL CHECK (rating IN ('LOW', 'MODERATE', 'ELEVATED', 'HIGH')),
  summary text NOT NULL,
  top_action text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, report_range)
);

CREATE INDEX IF NOT EXISTS idx_ai_risk_posture_client ON ai_risk_posture (client_id, report_range);
