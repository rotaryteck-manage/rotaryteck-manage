CREATE TABLE IF NOT EXISTS notification_diagnostics115 (
 id INTEGER PRIMARY KEY CHECK(id=1),
 run_id TEXT NOT NULL,
 scheduled_for TEXT NOT NULL,
 phase TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 details TEXT NOT NULL DEFAULT '{}'
);
