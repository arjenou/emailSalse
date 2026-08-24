PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DEACTIVATED')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  company_name TEXT NOT NULL,
  company_name_en TEXT,
  company_name_ja TEXT,
  website_url TEXT NOT NULL,
  company_description TEXT,
  main_business TEXT,
  founded_year INTEGER,
  employee_count INTEGER,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'CN',
  province TEXT,
  city TEXT,
  address TEXT,
  contact_name TEXT NOT NULL,
  contact_name_kana TEXT,
  department TEXT,
  job_title TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DEACTIVATED')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  advantages TEXT,
  service_type TEXT,
  product_url TEXT,
  moq TEXT,
  price_range TEXT,
  lead_time TEXT,
  certifications TEXT,
  additional_information TEXT,
  confirmed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  campaign_context TEXT,
  region TEXT NOT NULL DEFAULT '全国',
  excluded_industries_json TEXT NOT NULL DEFAULT '[]',
  core_message_ja TEXT NOT NULL,
  cta_ja TEXT NOT NULL,
  target_success_count INTEGER NOT NULL CHECK (target_success_count > 0),
  schedule_days_json TEXT NOT NULL DEFAULT '[]',
  schedule_time_jst TEXT,
  skip_japanese_holidays INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'PAUSED' CHECK (status IN ('RUNNING', 'PAUSED', 'PAUSED_INSUFFICIENT_CREDITS', 'ARCHIVED')),
  config_version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE campaign_products (
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  PRIMARY KEY (campaign_id, product_id)
);

CREATE TABLE campaign_config_versions (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  version INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (campaign_id, version)
);

CREATE TABLE campaign_runs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  source TEXT NOT NULL CHECK (source IN ('SCHEDULED', 'MANUAL', 'CONFIG_CHANGED', 'WORKSPACE_CONFIG_CHANGED')),
  target_success_count INTEGER NOT NULL,
  success_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'COMPLETED', 'ENDED', 'CANCELLED')),
  ended_reason TEXT,
  config_version INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX one_active_run_per_campaign
ON campaign_runs(campaign_id) WHERE status = 'ACTIVE';

CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  normalized_domain TEXT NOT NULL UNIQUE,
  brand_identity TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  campaign_run_id TEXT NOT NULL REFERENCES campaign_runs(id),
  company_id TEXT NOT NULL REFERENCES companies(id),
  source TEXT NOT NULL DEFAULT 'AI_DISCOVERY',
  lead_score INTEGER CHECK (lead_score BETWEEN 0 AND 100),
  qualification_reason TEXT,
  status TEXT NOT NULL DEFAULT 'DISCOVERED',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE outreach_attempts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  campaign_run_id TEXT NOT NULL REFERENCES campaign_runs(id),
  lead_id TEXT NOT NULL REFERENCES leads(id),
  company_id TEXT NOT NULL REFERENCES companies(id),
  selected_contact_form TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'SKIPPED')),
  reason TEXT,
  final_message TEXT,
  sender_snapshot_json TEXT NOT NULL,
  campaign_config_version INTEGER NOT NULL,
  message_version INTEGER NOT NULL,
  credit_charged INTEGER NOT NULL DEFAULT 0,
  processed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE workspace_suppression (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  company_identity TEXT,
  brand_identity TEXT,
  domain TEXT NOT NULL,
  reason TEXT NOT NULL,
  source_outreach_id TEXT REFERENCES outreach_attempts(id),
  permanent INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (workspace_id, domain)
);

CREATE TABLE credit_balances (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id),
  trial INTEGER NOT NULL DEFAULT 0 CHECK (trial >= 0),
  subscription INTEGER NOT NULL DEFAULT 0 CHECK (subscription >= 0),
  top_up INTEGER NOT NULL DEFAULT 0 CHECK (top_up >= 0),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE credit_ledger (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  credit_type TEXT NOT NULL CHECK (credit_type IN ('TRIAL', 'SUBSCRIPTION', 'TOP_UP')),
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  balance_after INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (workspace_id, reference_id)
);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  campaign_id TEXT REFERENCES campaigns(id),
  campaign_run_id TEXT REFERENCES campaign_runs(id),
  outreach_id TEXT REFERENCES outreach_attempts(id),
  job_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED')),
  priority INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL DEFAULT '{}',
  available_at INTEGER NOT NULL DEFAULT (unixepoch()),
  locked_at INTEGER,
  locked_by TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  error_message TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX jobs_claimable ON jobs(status, available_at, priority DESC, created_at);

CREATE TABLE success_evidence (
  id TEXT PRIMARY KEY,
  outreach_id TEXT NOT NULL UNIQUE REFERENCES outreach_attempts(id),
  bucket TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  metadata_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id),
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

