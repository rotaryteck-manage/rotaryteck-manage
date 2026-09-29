CREATE TABLE IF NOT EXISTS schedule_leave72 (
 id TEXT PRIMARY KEY,
 start_at TEXT NOT NULL,
 end_at TEXT NOT NULL,
 people TEXT NOT NULL,
 reason TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 author_name TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS schedule_leave72_range ON schedule_leave72(start_at,end_at);
