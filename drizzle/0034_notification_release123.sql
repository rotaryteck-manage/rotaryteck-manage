-- Durable deployment boundary. Reapplying the migration must never move it.
CREATE TABLE IF NOT EXISTS notification_release123 (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 cutoff TEXT NOT NULL
);
INSERT OR IGNORE INTO notification_release123(singleton,cutoff)
 VALUES(1,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
CREATE TABLE IF NOT EXISTS notification_recoveries123 (
 dedupe_key TEXT PRIMARY KEY,
 recovered_at TEXT NOT NULL
);
ALTER TABLE notification_device_scopes121 ADD COLUMN manual_only123 INTEGER NOT NULL DEFAULT 0;
