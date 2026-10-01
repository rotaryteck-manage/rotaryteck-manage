CREATE TABLE IF NOT EXISTS retention_photo_jobs(job TEXT PRIMARY KEY NOT NULL);
CREATE TABLE IF NOT EXISTS app_permission_profiles(id TEXT PRIMARY KEY,name TEXT NOT NULL,permissions TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS app_permission_order(profile_id TEXT PRIMARY KEY,position INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS app_employee_settings(employee_id INTEGER PRIMARY KEY,profile_id TEXT NOT NULL DEFAULT '',position INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS app_permission_migrations(id TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS wire_pending_uploads(id TEXT PRIMARY KEY,created_at TEXT NOT NULL);
