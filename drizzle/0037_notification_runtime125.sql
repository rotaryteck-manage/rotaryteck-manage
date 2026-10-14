CREATE TABLE IF NOT EXISTS notification_runs125 (id TEXT PRIMARY KEY,scheduled_for TEXT NOT NULL,status TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS notification_tasks125 (id TEXT PRIMARY KEY,run_id TEXT NOT NULL,kind TEXT NOT NULL,payload TEXT NOT NULL,priority INTEGER NOT NULL,status TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL,error TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS notification_tasks125_work ON notification_tasks125(run_id,status,priority);
CREATE UNIQUE INDEX IF NOT EXISTS notification_runs125_active ON notification_runs125(status) WHERE status='running';
CREATE TABLE IF NOT EXISTS notification_runtime_meta125 (singleton INTEGER PRIMARY KEY CHECK(singleton=1),cutoff TEXT NOT NULL);
INSERT OR IGNORE INTO notification_runtime_meta125(singleton,cutoff) VALUES(1,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
