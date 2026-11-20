CREATE TABLE IF NOT EXISTS pcb_projects171(
 id TEXT PRIMARY KEY,name TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',archived INTEGER NOT NULL DEFAULT 0,
 revision INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS pcb_project_name171 ON pcb_projects171(lower(trim(name))) WHERE archived=0;
CREATE TABLE IF NOT EXISTS pcb_items171(
 id TEXT PRIMARY KEY,name TEXT NOT NULL,stock INTEGER NOT NULL DEFAULT 0 CHECK(stock>=0 AND stock<=1000000000),
 note TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pcb_links171(
 id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES pcb_projects171(id),item_id TEXT NOT NULL REFERENCES pcb_items171(id),
 label TEXT NOT NULL,per_set INTEGER CHECK(per_set IS NULL OR per_set>0),note TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
 UNIQUE(project_id,label)
);
CREATE INDEX IF NOT EXISTS pcb_link_item171 ON pcb_links171(item_id);
CREATE TABLE IF NOT EXISTS pcb_fixtures171(
 id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES pcb_projects171(id),name TEXT NOT NULL,applies TEXT NOT NULL DEFAULT '[]',
 location TEXT NOT NULL DEFAULT '',note TEXT NOT NULL DEFAULT '',holder_id TEXT NOT NULL DEFAULT '',holder_name TEXT NOT NULL DEFAULT '',
 taken_at TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS pcb_fixture_project171 ON pcb_fixtures171(project_id);
CREATE TABLE IF NOT EXISTS pcb_events171(
 id TEXT PRIMARY KEY,project_id TEXT NOT NULL,type TEXT NOT NULL,detail TEXT NOT NULL,actor_id TEXT NOT NULL,actor_name TEXT NOT NULL,created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS pcb_event_project171 ON pcb_events171(project_id,created_at DESC);
CREATE TABLE IF NOT EXISTS pcb_photos171(
 id TEXT PRIMARY KEY,project_id TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,
 storage_key TEXT NOT NULL,file_name TEXT NOT NULL,actor_name TEXT NOT NULL,created_at TEXT NOT NULL,deleted_at TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS pcb_photo_entity171 ON pcb_photos171(entity_type,entity_id,deleted_at);
CREATE TABLE IF NOT EXISTS pcb_commits171(id TEXT PRIMARY KEY,actor_id TEXT NOT NULL,signature TEXT NOT NULL,result TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS pcb_guards171(id TEXT PRIMARY KEY,valid INTEGER NOT NULL CHECK(valid=1));

CREATE INDEX IF NOT EXISTS pcb_event_time171 ON pcb_events171(created_at DESC);
