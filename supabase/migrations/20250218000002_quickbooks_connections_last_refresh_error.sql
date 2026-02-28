-- Store refresh failure reason when status = needs_reauth (optional column).
-- Run in Supabase SQL Editor if not using CLI migrations.

ALTER TABLE quickbooks_connections
  ADD COLUMN IF NOT EXISTS last_refresh_error text;

COMMENT ON COLUMN quickbooks_connections.last_refresh_error IS 'Error message when token refresh failed and status was set to needs_reauth';
COMMENT ON COLUMN quickbooks_connections.status IS 'connected | needs_reauth';