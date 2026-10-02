CREATE TABLE IF NOT EXISTS notification_source_state90 (
  source_key TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  source_id TEXT NOT NULL DEFAULT '',
  effective_date TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '{}',
  checked_at TEXT NOT NULL DEFAULT '',
  changed_at TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS notification_source_state90_date_idx
ON notification_source_state90(effective_date, status);
