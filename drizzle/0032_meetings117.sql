CREATE TABLE IF NOT EXISTS meetings117 (
 id TEXT PRIMARY KEY NOT NULL, day TEXT NOT NULL, time TEXT NOT NULL, place TEXT NOT NULL,
 attendees TEXT NOT NULL, notes TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
 author_id INTEGER NOT NULL, author_name TEXT NOT NULL, editor_id INTEGER NOT NULL,
 editor_name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 deleted_at TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS meetings117_day ON meetings117(deleted_at,day DESC,created_at DESC);
CREATE TABLE IF NOT EXISTS meeting_settings117 (id INTEGER PRIMARY KEY CHECK(id=1),body TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS meeting_requests117 (request_id TEXT PRIMARY KEY,signature TEXT NOT NULL,result TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS meeting_guards117 (id TEXT PRIMARY KEY,valid INTEGER NOT NULL CHECK(valid=1));
CREATE TABLE IF NOT EXISTS meeting_events117 (
 event_key TEXT PRIMARY KEY,meeting_id TEXT NOT NULL,recipient_id INTEGER NOT NULL,payload TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS meeting_events117_pending ON meeting_events117(status,attempts,created_at);
