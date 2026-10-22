-- Durable logical stop-work notices. Existing receipts and all other notification settings remain intact.
CREATE TABLE notification_closure_events135 (
 event_key TEXT PRIMARY KEY,rule_id TEXT NOT NULL,source_key TEXT NOT NULL,effective_date TEXT NOT NULL,
 status TEXT NOT NULL,period_key TEXT NOT NULL,created_at TEXT NOT NULL,sealed INTEGER NOT NULL DEFAULT 0 CHECK(sealed IN (0,1))
);
CREATE INDEX notification_closure_events135_day ON notification_closure_events135(rule_id,effective_date);
CREATE TABLE notification_closure_deliveries135 (
 delivery_key TEXT PRIMARY KEY,event_key TEXT NOT NULL,employee_id INTEGER NOT NULL,inbox_id TEXT NOT NULL,
 payload TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL
);
CREATE INDEX notification_closure_deliveries135_pending ON notification_closure_deliveries135(status,event_key);
