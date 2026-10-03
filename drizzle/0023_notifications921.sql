ALTER TABLE notification_deliveries ADD COLUMN category TEXT NOT NULL DEFAULT '';

ALTER TABLE notification_test_audit92 ADD COLUMN results_json TEXT NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS notification_receipts921 (
  dedupe_key TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO notification_receipts921(dedupe_key,status,attempts,created_at,updated_at,completed_at)
SELECT dedupe_key,status,CASE WHEN status='sent' THEN 1 ELSE retry_count+1 END,created_at,
       CASE WHEN sent_at<>'' THEN sent_at ELSE COALESCE(NULLIF(last_attempt_at,''),created_at) END,
       CASE WHEN status='sent' THEN sent_at ELSE '' END
FROM notification_deliveries;

CREATE INDEX IF NOT EXISTS notification_receipts921_status_idx
ON notification_receipts921(status,updated_at);

CREATE TABLE IF NOT EXISTS notification_rule_state921 (
  rule_id TEXT PRIMARY KEY NOT NULL,
  fingerprint TEXT NOT NULL DEFAULT '',
  recipient_ids TEXT NOT NULL DEFAULT '[]',
  suppress_day TEXT NOT NULL DEFAULT '',
  suppressed_ids TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_daily_usage921 (
  day TEXT PRIMARY KEY NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_rule_run921 (
  rule_id TEXT NOT NULL,
  day TEXT NOT NULL,
  eligible_ids TEXT NOT NULL DEFAULT '[]',
  checked_at TEXT NOT NULL,
  PRIMARY KEY(rule_id,day)
);
