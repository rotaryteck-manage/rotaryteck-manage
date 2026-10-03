ALTER TABLE notification_deliveries ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE notification_deliveries ADD COLUMN last_attempt_at TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS notification_test_audit92 (
  id TEXT PRIMARY KEY NOT NULL,
  actor_id INTEGER NOT NULL,
  actor_name TEXT NOT NULL,
  target_employee TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  device_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  source_page TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS notification_test_audit92_created_idx
ON notification_test_audit92(created_at DESC);
