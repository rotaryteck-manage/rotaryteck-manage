CREATE TABLE IF NOT EXISTS notification_scheduler_status108 (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  scheduled_for TEXT NOT NULL DEFAULT '',
  started_at TEXT NOT NULL DEFAULT '',
  completed_at TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'never',
  planned INTEGER NOT NULL DEFAULT 0,
  eligible INTEGER NOT NULL DEFAULT 0,
  sent INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  deferred INTEGER NOT NULL DEFAULT 0,
  error_message TEXT NOT NULL DEFAULT ''
);
