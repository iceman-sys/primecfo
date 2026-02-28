-- QuickBooks OAuth connection and token storage (production schema).
-- Run in Supabase SQL Editor if not using CLI migrations.

CREATE TABLE IF NOT EXISTS quickbooks_connections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           text NOT NULL,
  realm_id            text NOT NULL,
  access_token        text NOT NULL,
  refresh_token       text NOT NULL,
  access_expires_at   timestamptz NOT NULL,
  refresh_expires_at  timestamptz NOT NULL,
  scope               text,
  status              text NOT NULL DEFAULT 'connected',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id)
);

CREATE INDEX IF NOT EXISTS idx_quickbooks_connections_client_id ON quickbooks_connections (client_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_connections_access_expires_at ON quickbooks_connections (access_expires_at);

COMMENT ON TABLE quickbooks_connections IS 'QBO OAuth tokens and connection per client; tokens stored encrypted (enc:v1:...)';
