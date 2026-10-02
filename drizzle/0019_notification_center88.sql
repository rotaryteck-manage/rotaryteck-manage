CREATE TABLE IF NOT EXISTS notification_inbox88 (
  id TEXT PRIMARY KEY NOT NULL,
  employee_id INTEGER NOT NULL,
  category TEXT NOT NULL DEFAULT '其他',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_url TEXT NOT NULL DEFAULT '/',
  source_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  read_at TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS notification_inbox88_employee_idx
ON notification_inbox88(employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notification_inbox88_unread_idx
ON notification_inbox88(employee_id, read_at, created_at DESC);
