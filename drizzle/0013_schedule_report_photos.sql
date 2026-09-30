CREATE TABLE IF NOT EXISTS schedule_report_photos (
 id TEXT PRIMARY KEY NOT NULL,
 report_id TEXT NOT NULL,
 photo_key TEXT NOT NULL,
 photo_name TEXT NOT NULL DEFAULT '',
 sort_index INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS schedule_report_photos_report_idx
ON schedule_report_photos(report_id, sort_index);