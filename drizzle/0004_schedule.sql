CREATE TABLE IF NOT EXISTS schedule_entries (
 id TEXT PRIMARY KEY NOT NULL,
 kind TEXT NOT NULL,
 day TEXT NOT NULL,
 end_day TEXT NOT NULL,
 title TEXT NOT NULL,
 assignee TEXT NOT NULL DEFAULT '',
 color TEXT NOT NULL DEFAULT '#4e8069',
 note TEXT NOT NULL DEFAULT '',
 category TEXT NOT NULL DEFAULT '',
 quantity INTEGER NOT NULL DEFAULT 0,
 project_id TEXT NOT NULL DEFAULT '',
 author_id TEXT NOT NULL DEFAULT '',
 author_name TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS schedule_entries_day_idx ON schedule_entries(day,end_day);
CREATE TABLE IF NOT EXISTS schedule_reports (
 id TEXT PRIMARY KEY NOT NULL,
 entry_id TEXT NOT NULL DEFAULT '',
 day TEXT NOT NULL,
 body TEXT NOT NULL,
 photo_key TEXT,
 photo_name TEXT NOT NULL DEFAULT '',
 author_id TEXT NOT NULL,
 author_name TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS schedule_reports_day_idx ON schedule_reports(day);
