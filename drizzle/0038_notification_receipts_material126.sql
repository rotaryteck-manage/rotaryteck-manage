ALTER TABLE notification_deliveries ADD COLUMN device_received_at126 TEXT NOT NULL DEFAULT '';
ALTER TABLE notification_deliveries ADD COLUMN device_shown_at126 TEXT NOT NULL DEFAULT '';
ALTER TABLE notification_deliveries ADD COLUMN device_error126 TEXT NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS material_pending126 (material_id TEXT PRIMARY KEY,actor_id INTEGER NOT NULL,actor_name TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS material_events126 (event_key TEXT PRIMARY KEY,material_id TEXT NOT NULL,recipient_id INTEGER NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS material_events126_pending ON material_events126(status,created_at);
