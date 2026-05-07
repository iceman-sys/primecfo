-- Rule-based financial alerts (Act tier) and optional forecast snapshot cache.

CREATE TABLE IF NOT EXISTS financial_alert_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  alert_kind text NOT NULL CHECK (
    alert_kind IN (
      'cash_balance',
      'cash_crunch',
      'ar_spike',
      'revenue_trend',
      'expense_anomaly',
      'margin_erode'
    )
  ),
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'acknowledged', 'resolved', 'snoozed')),
  severity_key text NOT NULL DEFAULT '',
  title text NOT NULL,
  body text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  snoozed_until timestamptz,
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, alert_kind)
);

CREATE INDEX IF NOT EXISTS idx_financial_alert_events_client_state
  ON financial_alert_events (client_id, state);

COMMENT ON TABLE financial_alert_events IS 'PrimeCFO spec alerts; dedup via severity_key + state transitions';

CREATE TABLE IF NOT EXISTS cash_forecast_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  horizon_days int NOT NULL CHECK (horizon_days IN (30, 60, 90)),
  tier text NOT NULL,
  payload jsonb NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_forecast_snapshots_client_computed
  ON cash_forecast_snapshots (client_id, computed_at DESC);

COMMENT ON TABLE cash_forecast_snapshots IS 'Optional cache of forecast JSON for audits and faster dashboard loads';
