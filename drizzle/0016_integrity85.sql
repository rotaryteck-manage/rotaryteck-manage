CREATE TABLE IF NOT EXISTS schedule_write_guards(id TEXT PRIMARY KEY NOT NULL,valid INTEGER NOT NULL CHECK(valid=1));
ALTER TABLE schedule_entries ADD COLUMN assignee_ids TEXT NOT NULL DEFAULT '[]';
ALTER TABLE schedule_reports ADD COLUMN work_title TEXT NOT NULL DEFAULT '';
ALTER TABLE schedule_reports ADD COLUMN work_content TEXT NOT NULL DEFAULT '';
UPDATE schedule_entries SET assignee_ids=COALESCE((SELECT json_group_array(CAST(e.id AS TEXT)) FROM json_each(schedule_entries.assignee) a JOIN employees e ON e.name=a.value WHERE e.status='active' AND (SELECT COUNT(*) FROM employees x WHERE x.name=e.name AND x.status='active')=1),'[]') WHERE kind IN ('daily','weekly') AND json_valid(assignee) AND NOT EXISTS (SELECT 1 FROM json_each(schedule_entries.assignee) a WHERE (SELECT COUNT(*) FROM employees e WHERE e.name=a.value AND e.status='active')<>1);
UPDATE schedule_reports SET work_title=COALESCE((SELECT title FROM schedule_entries WHERE id=entry_id),''),work_content=COALESCE((SELECT category FROM schedule_entries WHERE id=entry_id),'');
CREATE TABLE IF NOT EXISTS notification_people(employee_id INTEGER PRIMARY KEY NOT NULL,enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),updated_at TEXT NOT NULL);
