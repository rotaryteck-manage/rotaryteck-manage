CREATE TABLE IF NOT EXISTS pcb_access177(
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
 owner_employee_id INTEGER,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,updated_by INTEGER
);
INSERT OR IGNORE INTO pcb_access177(singleton,enabled,owner_employee_id,updated_at)
 SELECT 1,1,CASE WHEN COUNT(*)=1 THEN MIN(id) ELSE NULL END,strftime('%Y-%m-%dT%H:%M:%fZ','now')
 FROM employees WHERE trim(name)='傅睿禾' AND status='active';
CREATE TABLE IF NOT EXISTS pcb_access_audit177(
 id TEXT PRIMARY KEY,actor_id INTEGER NOT NULL,enabled_before INTEGER NOT NULL,enabled_after INTEGER NOT NULL,created_at TEXT NOT NULL
);
