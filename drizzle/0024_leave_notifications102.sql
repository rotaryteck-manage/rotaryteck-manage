CREATE TABLE IF NOT EXISTS leave_notification_records102 (
  leave_id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leave_notification_events102 (
  event_key TEXT PRIMARY KEY NOT NULL,
  leave_id TEXT NOT NULL,
  recipient_id INTEGER NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS leave_notification_events102_pending
ON leave_notification_events102(status, attempts, created_at);
