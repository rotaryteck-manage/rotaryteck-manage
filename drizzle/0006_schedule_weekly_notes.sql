CREATE TABLE IF NOT EXISTS schedule_weekly_notes (
 week_start TEXT PRIMARY KEY NOT NULL,
 body TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 author_id TEXT NOT NULL,
 author_name TEXT NOT NULL
);
