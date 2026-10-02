ALTER TABLE schedule_reports ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
UPDATE schedule_reports SET updated_at=created_at WHERE updated_at='';
