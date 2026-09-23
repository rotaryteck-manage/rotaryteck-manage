CREATE TABLE IF NOT EXISTS state_records (
 record_id INTEGER PRIMARY KEY AUTOINCREMENT,
 record_key TEXT NOT NULL UNIQUE,
 body TEXT,
 revision INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS state_storage_meta (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 revision INTEGER NOT NULL,
 source_revision INTEGER NOT NULL,
 migrated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS state_commits (
 request_id TEXT PRIMARY KEY NOT NULL,
 signature TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision>0),
 result TEXT NOT NULL,
 created_at TEXT NOT NULL
);
