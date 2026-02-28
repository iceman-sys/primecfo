-- QuickBooks OAuth state (one-time use, short-lived) for callback verification.
-- Run this in Supabase SQL Editor if you use migrations manually.

CREATE TABLE IF NOT EXISTS qbo_oauth_state (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state      text NOT NULL UNIQUE,
  client_id  text NOT NULL,
  return_to  text NOT NULL DEFAULT 'add',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qbo_oauth_state_state ON qbo_oauth_state (state);
CREATE INDEX IF NOT EXISTS idx_qbo_oauth_state_created_at ON qbo_oauth_state (created_at);

COMMENT ON TABLE qbo_oauth_state IS 'Stored OAuth state for QuickBooks callback verification; delete after use or expire after ~10 min';
