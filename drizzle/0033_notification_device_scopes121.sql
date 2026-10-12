CREATE TABLE IF NOT EXISTS notification_device_scopes121 (
  source_key TEXT PRIMARY KEY NOT NULL,
  employee_id INTEGER NOT NULL,
  device_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO notification_device_scopes121(source_key,employee_id,device_ids,created_at)
WITH keyed AS (
 SELECT d.*,CASE WHEN d.subscription_id<>'' AND substr(d.dedupe_key,-length(d.subscription_id)-1)=':'||d.subscription_id THEN substr(d.dedupe_key,1,length(d.dedupe_key)-length(d.subscription_id)-1) ELSE d.dedupe_key END AS source_key FROM notification_deliveries d WHERE d.notification_type<>'test'
), dated AS (
 SELECT k.*,COALESCE(i.created_at,MIN(k.created_at) OVER(PARTITION BY k.source_key,k.employee_id)) AS first_at FROM keyed k LEFT JOIN notification_inbox88 i ON i.source_key=k.source_key AND i.employee_id=k.employee_id
)
SELECT k.source_key,k.employee_id,json_group_array(DISTINCT k.subscription_id),MIN(k.first_at)
FROM dated k LEFT JOIN push_subscriptions s ON s.id=k.subscription_id WHERE s.id IS NULL OR julianday(s.created_at) IS NULL OR julianday(k.first_at) IS NULL OR julianday(s.created_at)<=julianday(k.first_at) GROUP BY k.source_key,k.employee_id;

INSERT OR IGNORE INTO notification_device_scopes121(source_key,employee_id,device_ids,created_at)
WITH keyed AS (
 SELECT r.created_at,s.id,s.employee_id,s.created_at AS device_created_at,substr(r.dedupe_key,1,length(r.dedupe_key)-length(s.id)-1) AS source_key FROM notification_receipts921 r JOIN push_subscriptions s ON substr(r.dedupe_key,-length(s.id)-1)=':'||s.id
), dated AS (
 SELECT k.*,COALESCE(i.created_at,MIN(k.created_at) OVER(PARTITION BY k.source_key,k.employee_id)) AS first_at FROM keyed k LEFT JOIN notification_inbox88 i ON i.source_key=k.source_key AND i.employee_id=k.employee_id
)
SELECT source_key,employee_id,json_group_array(DISTINCT id),MIN(first_at) FROM dated WHERE julianday(device_created_at) IS NULL OR julianday(first_at) IS NULL OR julianday(device_created_at)<=julianday(first_at) GROUP BY source_key,employee_id;

INSERT OR IGNORE INTO notification_device_scopes121(source_key,employee_id,device_ids,created_at)
SELECT source_key,employee_id,'[]',created_at FROM notification_inbox88;
