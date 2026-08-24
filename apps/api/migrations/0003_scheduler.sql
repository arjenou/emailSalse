CREATE TABLE japanese_holidays (
  holiday_date TEXT PRIMARY KEY,
  name_ja TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE scheduled_run_fires (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  scheduled_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'CREATED', 'SKIPPED_ACTIVE_RUN', 'SKIPPED_HOLIDAY', 'INSUFFICIENT_CREDITS', 'ERROR')),
  campaign_run_id TEXT,
  reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (campaign_id, scheduled_key)
);
