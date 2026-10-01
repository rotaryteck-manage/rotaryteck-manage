CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  employee_id INTEGER NOT NULL,

  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,

  device_label TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',

  enabled INTEGER NOT NULL DEFAULT 1,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  last_success_at TEXT NOT NULL DEFAULT '',
  last_error_at TEXT NOT NULL DEFAULT '',
  failure_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS push_subscriptions_employee_idx
ON push_subscriptions(employee_id);

CREATE INDEX IF NOT EXISTS push_subscriptions_enabled_idx
ON push_subscriptions(enabled, employee_id);


CREATE TABLE IF NOT EXISTS notification_deliveries (
  id TEXT PRIMARY KEY NOT NULL,

  rule_id TEXT NOT NULL DEFAULT '',
  employee_id INTEGER NOT NULL,
  subscription_id TEXT NOT NULL DEFAULT '',

  notification_type TEXT NOT NULL DEFAULT '',

  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_url TEXT NOT NULL DEFAULT '/',

  status TEXT NOT NULL DEFAULT 'pending',

  dedupe_key TEXT NOT NULL UNIQUE,

  created_at TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT '',
  error_message TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS notification_deliveries_employee_idx
ON notification_deliveries(employee_id, created_at);

CREATE INDEX IF NOT EXISTS notification_deliveries_rule_idx
ON notification_deliveries(rule_id, created_at);

CREATE INDEX IF NOT EXISTS notification_deliveries_status_idx
ON notification_deliveries(status, created_at);