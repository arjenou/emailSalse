ALTER TABLE campaigns ADD COLUMN discovery_queries_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE campaigns ADD COLUMN source_urls_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE campaigns ADD COLUMN max_leads INTEGER NOT NULL DEFAULT 20 CHECK (max_leads BETWEEN 1 AND 100);

ALTER TABLE companies ADD COLUMN description TEXT;
ALTER TABLE companies ADD COLUMN source_url TEXT;
ALTER TABLE companies ADD COLUMN website_status TEXT NOT NULL DEFAULT 'UNVERIFIED';

ALTER TABLE jobs ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 3;
ALTER TABLE jobs ADD COLUMN lease_expires_at INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS one_lead_per_company_per_run
ON leads(campaign_run_id, company_id);

CREATE TABLE discovery_sources (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  campaign_run_id TEXT NOT NULL REFERENCES campaign_runs(id),
  query TEXT,
  url TEXT NOT NULL,
  title TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('DIRECTORY', 'EXHIBITION', 'ASSOCIATION', 'SEARCH_RESULT', 'MANUAL')),
  status TEXT NOT NULL DEFAULT 'DISCOVERED' CHECK (status IN ('DISCOVERED', 'FETCHED', 'FAILED', 'BLOCKED')),
  error_message TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (campaign_run_id, url)
);

CREATE TABLE contact_forms (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  url TEXT NOT NULL,
  policy_status TEXT NOT NULL CHECK (policy_status IN ('ALLOWED', 'PROHIBITED', 'CAPTCHA_VISIBLE', 'UNKNOWN')),
  policy_reason TEXT,
  has_form INTEGER NOT NULL DEFAULT 0,
  last_checked_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (company_id, url)
);

CREATE TABLE outreach_evidence_artifacts (
  id TEXT PRIMARY KEY,
  outreach_id TEXT NOT NULL REFERENCES outreach_attempts(id),
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('BEFORE_SUBMIT', 'CONFIRMATION', 'COMPLETED', 'ERROR')),
  bucket TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'image/png',
  metadata_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (outreach_id, evidence_type)
);

CREATE INDEX discovery_sources_run ON discovery_sources(campaign_run_id, status);
CREATE INDEX contact_forms_company ON contact_forms(company_id, policy_status);
CREATE INDEX outreach_evidence_outreach ON outreach_evidence_artifacts(outreach_id, evidence_type);
