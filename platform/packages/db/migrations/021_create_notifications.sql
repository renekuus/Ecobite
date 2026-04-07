-- ── notifications ────────────────────────────────────────────────────────────
-- Log of every push/SMS/email dispatch attempt. Append-only in practice.
CREATE TABLE notifications (
  id             UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type notification_recipient_type NOT NULL,
  recipient_id   UUID                        NOT NULL,
  channel        notification_channel        NOT NULL,
  template       TEXT                        NOT NULL,  -- e.g. 'order.confirmed'
  -- Full payload sent to the notification provider (FCM, Twilio, SendGrid, etc.)
  payload        JSONB                       NOT NULL DEFAULT '{}',
  sent_at        TIMESTAMPTZ,
  delivered_at   TIMESTAMPTZ,
  failed_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ                 NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications (recipient_type, recipient_id);
CREATE INDEX idx_notifications_created   ON notifications (created_at DESC);
-- Retry queue: find failed notifications that haven't been resolved
CREATE INDEX idx_notifications_failed    ON notifications (created_at DESC)
  WHERE failed_at IS NOT NULL AND delivered_at IS NULL;
