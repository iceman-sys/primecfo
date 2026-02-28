-- QuickBooks webhook receipts: store each verified webhook for processing.
-- A sync job or worker can SELECT * FROM qbo_webhook_receipts WHERE processing_status = 'pending'.

CREATE TABLE IF NOT EXISTS qbo_webhook_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at timestamptz NOT NULL DEFAULT now(),
  intuit_signature text,
  payload jsonb NOT NULL,
  processing_status text NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'processed', 'failed')),
  processed_at timestamptz,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_qbo_webhook_receipts_processing_status
  ON qbo_webhook_receipts (processing_status) WHERE processing_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_qbo_webhook_receipts_received_at
  ON qbo_webhook_receipts (received_at DESC);

COMMENT ON TABLE qbo_webhook_receipts IS 'Verified QuickBooks webhook payloads; process pending rows in a sync job or worker';
COMMENT ON COLUMN qbo_webhook_receipts.processing_status IS 'pending | processing | processed | failed';