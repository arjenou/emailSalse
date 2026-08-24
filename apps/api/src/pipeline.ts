import { isQualifiedLead, normalizeDomain, type EvidenceType, type JobType } from "@kylon/core";
import type { Env } from "./env";
import { HttpError } from "./http";

interface LockedJob {
  id: string;
  workspace_id: string;
  campaign_id: string;
  campaign_run_id: string;
  outreach_id: string | null;
  job_type: JobType;
  payload_json: string;
}

interface DiscoverySourceInput {
  url: string;
  query?: string;
  title?: string;
  sourceType: "DIRECTORY" | "EXHIBITION" | "ASSOCIATION" | "SEARCH_RESULT" | "MANUAL";
  status?: "DISCOVERED" | "FETCHED" | "FAILED" | "BLOCKED";
  errorMessage?: string;
}

interface CompanyInput {
  name: string;
  websiteUrl: string;
  description?: string;
  sourceUrl?: string;
}

async function lockedJob(env: Env, jobId: string, workerId: string, expected: JobType) {
  const job = await env.DB.prepare(
    `SELECT id, workspace_id, campaign_id, campaign_run_id, outreach_id, job_type, payload_json
     FROM jobs WHERE id = ? AND status = 'RUNNING' AND locked_by = ?`
  ).bind(jobId, workerId).first<LockedJob>();
  if (!job) throw new HttpError(409, "JOB_LOCK_MISMATCH");
  if (job.job_type !== expected) throw new HttpError(409, "JOB_TYPE_MISMATCH");
  return job;
}

export async function recordDiscoveryResults(env: Env, jobId: string, input: {
  workerId: string;
  sources?: DiscoverySourceInput[];
  companies?: CompanyInput[];
}) {
  const job = await lockedJob(env, jobId, input.workerId, "DISCOVER_LEADS");
  const payload = JSON.parse(job.payload_json) as Record<string, unknown>;
  const maxLeads = Math.min(Number(payload.maxLeads ?? 20), 100);

  for (const source of (input.sources ?? []).slice(0, 50)) {
    if (!source.url.startsWith("http")) continue;
    await env.DB.prepare(
      `INSERT INTO discovery_sources (id, workspace_id, campaign_id, campaign_run_id, query, url, title, source_type, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (campaign_run_id, url) DO UPDATE SET title = excluded.title, status = excluded.status,
       error_message = excluded.error_message, updated_at = unixepoch()`
    ).bind(crypto.randomUUID(), job.workspace_id, job.campaign_id, job.campaign_run_id,
      source.query ?? null, source.url, source.title ?? null, source.sourceType,
      source.status ?? "DISCOVERED", source.errorMessage?.slice(0, 1000) ?? null).run();
  }

  let enqueued = 0;
  for (const candidate of (input.companies ?? []).slice(0, maxLeads)) {
    let domain: string;
    try { domain = normalizeDomain(candidate.websiteUrl); } catch { continue; }
    const companyId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO companies (id, name, website_url, normalized_domain, description, source_url, website_status)
       VALUES (?, ?, ?, ?, ?, ?, 'UNVERIFIED')
       ON CONFLICT (normalized_domain) DO UPDATE SET
       name = excluded.name, website_url = excluded.website_url,
       description = COALESCE(excluded.description, companies.description),
       source_url = COALESCE(excluded.source_url, companies.source_url), updated_at = unixepoch()`
    ).bind(companyId, candidate.name.trim().slice(0, 300), candidate.websiteUrl, domain,
      candidate.description?.slice(0, 2000) ?? null, candidate.sourceUrl ?? null).run();
    const company = await env.DB.prepare("SELECT id FROM companies WHERE normalized_domain = ?")
      .bind(domain).first<{ id: string }>();
    if (!company) continue;
    const suppressed = await env.DB.prepare(
      "SELECT id FROM workspace_suppression WHERE workspace_id = ? AND domain = ? AND permanent = 1 LIMIT 1"
    ).bind(job.workspace_id, domain).first();
    if (suppressed) continue;

    const leadId = crypto.randomUUID();
    const inserted = await env.DB.prepare(
      `INSERT INTO leads (id, workspace_id, campaign_id, campaign_run_id, company_id, source, status)
       VALUES (?, ?, ?, ?, ?, 'PUBLIC_WEB', 'DISCOVERED')
       ON CONFLICT (campaign_run_id, company_id) DO NOTHING`
    ).bind(leadId, job.workspace_id, job.campaign_id, job.campaign_run_id, company.id).run();
    if (inserted.meta.changes !== 1) continue;

    await env.DB.prepare(
      `INSERT INTO jobs (id, workspace_id, campaign_id, campaign_run_id, job_type, status, priority, payload_json)
       VALUES (?, ?, ?, ?, 'QUALIFY_LEAD', 'PENDING', 80, ?)`
    ).bind(crypto.randomUUID(), job.workspace_id, job.campaign_id, job.campaign_run_id, JSON.stringify({
      ...payload,
      leadId,
      companyId: company.id,
      companyName: candidate.name,
      websiteUrl: candidate.websiteUrl,
      description: candidate.description ?? "",
      sourceUrl: candidate.sourceUrl ?? ""
    })).run();
    enqueued += 1;
  }
  return { enqueued };
}

export async function recordQualificationResult(env: Env, jobId: string, input: {
  workerId: string;
  leadId: string;
  score: number;
  reason: string;
  personalizedIntro?: string;
  contactFormUrl?: string;
  policyStatus: "ALLOWED" | "PROHIBITED" | "CAPTCHA_VISIBLE" | "UNKNOWN";
  policyReason?: string;
}) {
  const job = await lockedJob(env, jobId, input.workerId, "QUALIFY_LEAD");
  const payload = JSON.parse(job.payload_json) as { leadId?: string; companyId?: string };
  if (payload.leadId !== input.leadId || !payload.companyId) throw new HttpError(409, "LEAD_MISMATCH");
  const score = Math.max(0, Math.min(100, Math.round(input.score)));
  const qualified = isQualifiedLead(score) && input.policyStatus === "ALLOWED" && Boolean(input.contactFormUrl);
  const leadStatus = input.policyStatus === "PROHIBITED" ? "SKIPPED_PROHIBITED"
    : input.policyStatus === "CAPTCHA_VISIBLE" ? "MANUAL_REVIEW"
      : !input.contactFormUrl ? "NO_FORM" : qualified ? "QUALIFIED" : "REJECTED";
  await env.DB.prepare(
    `UPDATE leads SET lead_score = ?, qualification_reason = ?, status = ?, updated_at = unixepoch() WHERE id = ?`
  ).bind(score, input.reason.slice(0, 2000), leadStatus, input.leadId).run();

  if (input.contactFormUrl) {
    await env.DB.prepare(
      `INSERT INTO contact_forms (id, company_id, url, policy_status, policy_reason, has_form)
       VALUES (?, ?, ?, ?, ?, 1)
       ON CONFLICT (company_id, url) DO UPDATE SET policy_status = excluded.policy_status,
       policy_reason = excluded.policy_reason, has_form = excluded.has_form,
       last_checked_at = unixepoch(), updated_at = unixepoch()`
    ).bind(crypto.randomUUID(), payload.companyId, input.contactFormUrl, input.policyStatus,
      input.policyReason?.slice(0, 1000) ?? null).run();
  }

  const company = await env.DB.prepare("SELECT name, normalized_domain FROM companies WHERE id = ?")
    .bind(payload.companyId).first<{ name: string; normalized_domain: string }>();
  if (input.policyStatus === "PROHIBITED" && company) {
    await env.DB.prepare(
      `INSERT INTO workspace_suppression (id, workspace_id, company_identity, domain, reason)
       VALUES (?, ?, ?, ?, 'CONTACT_POLICY_PROHIBITED')
       ON CONFLICT (workspace_id, domain) DO NOTHING`
    ).bind(crypto.randomUUID(), job.workspace_id, company.name, company.normalized_domain).run();
  }
  if (!qualified || !company || !input.contactFormUrl) return { enqueued: false, status: leadStatus };

  const context = await env.DB.prepare(
    `SELECT c.name AS campaign_name, c.core_message_ja, c.cta_ja, c.config_version,
      w.company_name, w.company_name_en, w.company_name_ja, w.contact_name, w.contact_name_kana,
      w.department, w.job_title, w.email, w.phone, w.postal_code, w.address
     FROM campaigns c JOIN workspaces w ON w.id = c.workspace_id WHERE c.id = ?`
  ).bind(job.campaign_id).first<Record<string, string | number | null>>();
  if (!context) throw new HttpError(404, "CAMPAIGN_CONTEXT_NOT_FOUND");
  const outreachId = crypto.randomUUID();
  const sender = {
    companyName: context.company_name,
    companyNameEn: context.company_name_en,
    companyNameJa: context.company_name_ja,
    contactName: context.contact_name,
    contactNameKana: context.contact_name_kana,
    department: context.department,
    jobTitle: context.job_title,
    email: context.email,
    phone: context.phone,
    postalCode: context.postal_code,
    address: context.address
  };
  const subject = `${context.campaign_name}に関するご提案`;
  const finalMessage = [input.personalizedIntro, context.core_message_ja, context.cta_ja]
    .filter(Boolean).join("\n\n");
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO outreach_attempts (id, workspace_id, campaign_id, campaign_run_id, lead_id, company_id,
       selected_contact_form, status, final_message, sender_snapshot_json, campaign_config_version, message_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, 1)`
    ).bind(outreachId, job.workspace_id, job.campaign_id, job.campaign_run_id, input.leadId,
      payload.companyId, input.contactFormUrl, finalMessage, JSON.stringify(sender), context.config_version),
    env.DB.prepare(
      `INSERT INTO jobs (id, workspace_id, campaign_id, campaign_run_id, outreach_id, job_type, status, priority, payload_json, max_attempts)
       VALUES (?, ?, ?, ?, ?, 'SUBMIT_OUTREACH', 'PENDING', 60, ?, 1)`
    ).bind(crypto.randomUUID(), job.workspace_id, job.campaign_id, job.campaign_run_id, outreachId,
      JSON.stringify({ outreachId, companyId: payload.companyId, companyName: company.name,
        contactFormUrl: input.contactFormUrl, subject, message: finalMessage, sender }))
  ]);
  return { enqueued: true, outreachId };
}

export async function recordOutreachResult(env: Env, jobId: string, input: {
  workerId: string;
  outreachId: string;
  result: "DRY_RUN" | "SUCCESS" | "FAILED" | "SKIPPED";
  reason?: string;
  successUrl?: string;
  successText?: string;
}) {
  const job = await lockedJob(env, jobId, input.workerId, "SUBMIT_OUTREACH");
  if (job.outreach_id !== input.outreachId) throw new HttpError(409, "OUTREACH_MISMATCH");
  const status = input.result === "SUCCESS" ? "SUCCESS"
    : input.result === "FAILED" ? "FAILED" : input.result === "SKIPPED" ? "SKIPPED" : "PENDING";
  const details = [input.reason, input.successUrl && `URL: ${input.successUrl}`,
    input.successText && `SUCCESS: ${input.successText}`].filter(Boolean).join("\n").slice(0, 3000);
  await env.DB.prepare(
    `UPDATE outreach_attempts SET status = ?, reason = ?, processed_at = unixepoch(), updated_at = unixepoch()
     WHERE id = ?`
  ).bind(status, input.result === "DRY_RUN" ? `DRY_RUN_READY${details ? `\n${details}` : ""}` : details || null,
    input.outreachId).run();
  return { status, result: input.result };
}

export async function storeEvidence(env: Env, jobId: string, workerId: string, outreachId: string,
  evidenceType: EvidenceType, request: Request) {
  const job = await lockedJob(env, jobId, workerId, "SUBMIT_OUTREACH");
  if (job.outreach_id !== outreachId) throw new HttpError(409, "OUTREACH_MISMATCH");
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > 5 * 1024 * 1024) throw new HttpError(413, "INVALID_EVIDENCE_SIZE");
  const contentType = request.headers.get("content-type") ?? "image/png";
  if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(contentType)) {
    throw new HttpError(415, "INVALID_EVIDENCE_TYPE");
  }
  const key = `${job.workspace_id}/${outreachId}/${evidenceType.toLowerCase()}-${crypto.randomUUID()}`;
  await env.EVIDENCE.put(key, bytes, { httpMetadata: { contentType } });
  await env.DB.prepare(
    `INSERT INTO outreach_evidence_artifacts (id, outreach_id, evidence_type, bucket, storage_key, content_type)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (outreach_id, evidence_type) DO UPDATE SET storage_key = excluded.storage_key,
     content_type = excluded.content_type, created_at = unixepoch()`
  ).bind(crypto.randomUUID(), outreachId, evidenceType, env.EVIDENCE_BUCKET, key, contentType).run();
  return { key };
}
