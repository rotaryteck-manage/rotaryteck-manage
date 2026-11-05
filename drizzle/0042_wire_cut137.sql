CREATE TABLE IF NOT EXISTS wire_cut_outbox137 (
 source_key TEXT PRIMARY KEY, employee_id INTEGER NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS wire_cut_outbox_pending137 ON wire_cut_outbox137(status,created_at);
INSERT INTO state_records(record_key,body,revision)
 SELECT '["root","notificationRules"]',json_array(json('{"id":"wire-cut-default137","type":"wire-cut","category":"裁線紀錄","name":"裁線紀錄通知","title":"【裁線紀錄】{案名}","message":"{登記人員}新增 1 筆裁線紀錄，含 {明細筆數} 列線材明細。點開查看。","time":"00:00","firstDays":0,"repeatDays":0,"target":"wire-cut-record","recipientMode":"auto","recipientIds":[],"enabled":true}')),1
 WHERE EXISTS(SELECT 1 FROM state_storage_meta WHERE singleton=1)
 ON CONFLICT(record_key) DO UPDATE SET body=json_insert(COALESCE(state_records.body,'[]'),'$[#]',json('{"id":"wire-cut-default137","type":"wire-cut","category":"裁線紀錄","name":"裁線紀錄通知","title":"【裁線紀錄】{案名}","message":"{登記人員}新增 1 筆裁線紀錄，含 {明細筆數} 列線材明細。點開查看。","time":"00:00","firstDays":0,"repeatDays":0,"target":"wire-cut-record","recipientMode":"auto","recipientIds":[],"enabled":true}')), revision=state_records.revision+1
 WHERE NOT EXISTS (SELECT 1 FROM json_each(state_records.body) WHERE json_extract(value,'$.type')='wire-cut');
UPDATE state_storage_meta SET revision=revision+1 WHERE singleton=1;
UPDATE company_state SET body=json_set(body,'$.notificationRules',json_insert(COALESCE(json_extract(body,'$.notificationRules'),'[]'),'$[#]',json('{"id":"wire-cut-default137","type":"wire-cut","category":"裁線紀錄","name":"裁線紀錄通知","title":"【裁線紀錄】{案名}","message":"{登記人員}新增 1 筆裁線紀錄，含 {明細筆數} 列線材明細。點開查看。","time":"00:00","firstDays":0,"repeatDays":0,"target":"wire-cut-record","recipientMode":"auto","recipientIds":[],"enabled":true}'))),revision=revision+1
 WHERE NOT EXISTS(SELECT 1 FROM state_storage_meta WHERE singleton=1)
 AND NOT EXISTS(SELECT 1 FROM json_each(body,'$.notificationRules') WHERE json_extract(value,'$.type')='wire-cut');
