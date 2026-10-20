-- Attendance has separate storage; no notification state or meeting content is rewritten.
CREATE TABLE IF NOT EXISTS meeting_attendance_meta132 (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1), enabled_at TEXT NOT NULL, snapshot_complete INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO meeting_attendance_meta132(singleton,enabled_at) VALUES(1,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
CREATE TABLE IF NOT EXISTS meeting_attendance_excluded132 (
 employee_id INTEGER PRIMARY KEY, name_at_exclusion TEXT NOT NULL
);
INSERT OR IGNORE INTO meeting_attendance_excluded132
 SELECT id,name FROM employees WHERE replace(replace(name,' ',''),'　','') IN ('機器人一號','機器人二號','機器人1號','機器人2號');
CREATE TABLE IF NOT EXISTS meeting_attendance_groups132 (
 meeting_id TEXT PRIMARY KEY, started_at TEXT NOT NULL, legacy INTEGER NOT NULL CHECK(legacy IN (0,1))
);
CREATE TABLE IF NOT EXISTS meeting_attendance_people132 (
 meeting_id TEXT NOT NULL, employee_id INTEGER NOT NULL, name TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0, first_read_at TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(meeting_id,employee_id)
);
-- Snapshot in the database transaction, including saves from an older open client during deployment.
CREATE TRIGGER IF NOT EXISTS meeting_attendance_snapshot132 AFTER INSERT ON meetings117
WHEN NEW.deleted_at=''
BEGIN
 INSERT OR IGNORE INTO meeting_attendance_excluded132
  SELECT id,name FROM employees WHERE replace(replace(name,' ',''),'　','') IN ('機器人一號','機器人二號','機器人1號','機器人2號');
 INSERT INTO meeting_attendance_groups132(meeting_id,started_at,legacy)
  VALUES(NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),0);
 INSERT INTO meeting_attendance_people132(meeting_id,employee_id,name,position)
  SELECT NEW.id,e.id,e.name,COALESCE(x.position,e.id)
  FROM employees e LEFT JOIN app_employee_settings x ON x.employee_id=e.id
  WHERE e.status='active'
  AND NOT EXISTS(SELECT 1 FROM meeting_attendance_excluded132 b WHERE b.employee_id=e.id);
END;
INSERT OR IGNORE INTO meeting_attendance_groups132
 SELECT id,(SELECT enabled_at FROM meeting_attendance_meta132 WHERE singleton=1),1
 FROM meetings117 WHERE deleted_at='';
INSERT OR IGNORE INTO meeting_attendance_people132(meeting_id,employee_id,name,position)
 SELECT m.id,e.id,e.name,COALESCE(x.position,e.id)
 FROM meetings117 m JOIN meeting_attendance_groups132 g ON g.meeting_id=m.id
 CROSS JOIN employees e LEFT JOIN app_employee_settings x ON x.employee_id=e.id
 WHERE m.deleted_at='' AND g.legacy=1 AND e.status='active'
 AND (SELECT snapshot_complete FROM meeting_attendance_meta132 WHERE singleton=1)=0
 AND NOT EXISTS(SELECT 1 FROM meeting_attendance_excluded132 b WHERE b.employee_id=e.id);
UPDATE meeting_attendance_meta132 SET snapshot_complete=1 WHERE singleton=1;
