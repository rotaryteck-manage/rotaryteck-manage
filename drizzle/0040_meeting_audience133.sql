-- Audience configuration changes no meeting content or notification state.
CREATE TABLE meeting_attendance_config133 (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1), configured INTEGER NOT NULL DEFAULT 0,
 revision INTEGER NOT NULL DEFAULT 0
);
INSERT INTO meeting_attendance_config133(singleton) VALUES(1);
CREATE TABLE meeting_attendance_selected133 (employee_id INTEGER PRIMARY KEY);
ALTER TABLE meeting_attendance_people132 ADD COLUMN included INTEGER NOT NULL DEFAULT 1 CHECK(included IN (0,1));
DROP TRIGGER meeting_attendance_snapshot132;
CREATE TRIGGER meeting_attendance_snapshot132 AFTER INSERT ON meetings117
WHEN NEW.deleted_at=''
BEGIN
 INSERT OR IGNORE INTO meeting_attendance_excluded132
  SELECT id,name FROM employees WHERE replace(replace(name,' ',''),'　','') IN ('機器人一號','機器人二號','機器人1號','機器人2號');
 INSERT INTO meeting_attendance_groups132(meeting_id,started_at,legacy)
  VALUES(NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),0);
 INSERT INTO meeting_attendance_people132(meeting_id,employee_id,name,position)
  SELECT NEW.id,e.id,e.name,COALESCE(x.position,e.id)
  FROM employees e LEFT JOIN app_employee_settings x ON x.employee_id=e.id
  WHERE e.status='active' AND (
   ((SELECT configured FROM meeting_attendance_config133 WHERE singleton=1)=0
    AND NOT EXISTS(SELECT 1 FROM meeting_attendance_excluded132 b WHERE b.employee_id=e.id))
   OR ((SELECT configured FROM meeting_attendance_config133 WHERE singleton=1)=1
    AND EXISTS(SELECT 1 FROM meeting_attendance_selected133 s WHERE s.employee_id=e.id))
  );
END;
