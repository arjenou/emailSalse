import type { Env } from "./env";
import { body, HttpError, json, requireWorker } from "./http";
import { claimNextJob, completeJob, failJob } from "./jobs";
import { pauseCampaign, startCampaign } from "./campaigns";
import { recordSuccessfulOutreach } from "./credits";
import { runScheduler } from "./scheduler";
import { recordDiscoveryResults, recordOutreachResult, recordQualificationResult, storeEvidence } from "./pipeline";

async function router(request: Request, env: Env) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return json({}, { status: 204 }, env);
  if (request.method === "GET" && url.pathname === "/health") {
    return json({ ok: true, service: "kylon-api" }, {}, env);
  }

  if (url.pathname.startsWith("/v1/") && env.REQUIRE_API_AUTH === "true") {
    requireWorker(request, env);
  }

  if (request.method === "GET" && url.pathname === "/v1/dashboard") {
    const [campaigns, outreach, leads, jobs] = await Promise.all([
      env.DB.prepare("SELECT status, COUNT(*) count FROM campaigns GROUP BY status").all(),
      env.DB.prepare("SELECT status, COUNT(*) count FROM outreach_attempts GROUP BY status").all(),
      env.DB.prepare("SELECT status, COUNT(*) count FROM leads GROUP BY status").all(),
      env.DB.prepare("SELECT status, COUNT(*) count FROM jobs GROUP BY status").all()
    ]);
    return json({ campaigns: campaigns.results, outreach: outreach.results, leads: leads.results, jobs: jobs.results }, {}, env);
  }

  if (request.method === "GET" && url.pathname === "/v1/workspace") {
    const workspace = await env.DB.prepare("SELECT * FROM workspaces WHERE id = 'ws_default'").first();
    return json({ workspace }, {}, env);
  }
  if (request.method === "PUT" && url.pathname === "/v1/workspace") {
    const input = await body<Record<string, string>>(request);
    if (!input.companyName?.trim() || !input.websiteUrl?.trim() || !input.contactName?.trim() || !input.email?.trim()) {
      throw new HttpError(400, "WORKSPACE_FIELDS_REQUIRED");
    }
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users (id, email) VALUES ('user_default', ?) ON CONFLICT (id) DO UPDATE SET email = excluded.email, updated_at = unixepoch()")
        .bind(input.email.trim()),
      env.DB.prepare(
        `INSERT INTO workspaces (id, user_id, company_name, company_name_en, company_name_ja, website_url,
         company_description, main_business, postal_code, country, province, city, address, contact_name,
         contact_name_kana, department, job_title, email, phone)
         VALUES ('ws_default', 'user_default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET company_name = excluded.company_name,
         company_name_en = excluded.company_name_en, company_name_ja = excluded.company_name_ja,
         website_url = excluded.website_url, company_description = excluded.company_description,
         main_business = excluded.main_business, postal_code = excluded.postal_code, country = excluded.country,
         province = excluded.province, city = excluded.city, address = excluded.address,
         contact_name = excluded.contact_name, contact_name_kana = excluded.contact_name_kana,
         department = excluded.department, job_title = excluded.job_title, email = excluded.email,
         phone = excluded.phone, updated_at = unixepoch()`
      ).bind(input.companyName.trim(), input.companyNameEn || null, input.companyNameJa || null,
        input.websiteUrl.trim(), input.companyDescription || null, input.mainBusiness || null,
        input.postalCode || null, input.country || "CN", input.province || null, input.city || null,
        input.address || null, input.contactName.trim(), input.contactNameKana || null,
        input.department || null, input.jobTitle || null, input.email.trim(), input.phone || null)
    ]);
    return json({ ok: true }, {}, env);
  }

  if (request.method === "GET" && url.pathname === "/v1/products") {
    const products = await env.DB.prepare("SELECT * FROM products WHERE workspace_id = 'ws_default' ORDER BY created_at DESC").all();
    return json({ products: products.results }, {}, env);
  }

  if (request.method === "GET" && url.pathname === "/v1/campaigns") {
    const campaigns = await env.DB.prepare(
      `SELECT c.*, cr.id AS active_run_id, cr.success_count,
       (SELECT COUNT(*) FROM leads l WHERE l.campaign_id = c.id) AS lead_count,
       (SELECT COUNT(*) FROM jobs j WHERE j.campaign_id = c.id AND j.status IN ('PENDING','RUNNING')) AS active_job_count
       FROM campaigns c LEFT JOIN campaign_runs cr ON cr.campaign_id = c.id AND cr.status = 'ACTIVE'
       WHERE c.workspace_id = 'ws_default' ORDER BY c.created_at DESC`
    ).all();
    return json({ campaigns: campaigns.results }, {}, env);
  }

  if (request.method === "GET" && url.pathname === "/v1/outreach") {
    const outreach = await env.DB.prepare(
      `SELECT oa.id, oa.status, oa.reason, oa.selected_contact_form, oa.processed_at, oa.created_at,
       c.name AS company_name, c.website_url, l.lead_score, l.qualification_reason,
       (SELECT COUNT(*) FROM outreach_evidence_artifacts e WHERE e.outreach_id = oa.id) AS evidence_count
       FROM outreach_attempts oa JOIN companies c ON c.id = oa.company_id JOIN leads l ON l.id = oa.lead_id
       WHERE oa.workspace_id = 'ws_default' ORDER BY oa.created_at DESC LIMIT 100`
    ).all();
    return json({ outreach: outreach.results }, {}, env);
  }

  if (request.method === "POST" && url.pathname === "/v1/products") {
    const input = await body<{
      workspaceId?: string; name?: string; description?: string; advantages?: string;
      serviceType?: string; productUrl?: string; moq?: string; leadTime?: string;
    }>(request);
    if (!input.name?.trim() || !input.description?.trim()) throw new HttpError(400, "PRODUCT_FIELDS_REQUIRED");
    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO products (id, workspace_id, name, description, advantages, service_type, product_url, moq, lead_time, confirmed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`
    ).bind(id, input.workspaceId ?? "ws_default", input.name.trim(), input.description.trim(), input.advantages ?? null,
      input.serviceType ?? null, input.productUrl ?? null, input.moq ?? null, input.leadTime ?? null).run();
    return json({ id }, { status: 201 }, env);
  }

  if (request.method === "POST" && url.pathname === "/v1/campaigns") {
    const input = await body<{
      workspaceId?: string; name?: string; context?: string; region?: string; productIds?: string[];
      coreMessageJa?: string; ctaJa?: string; targetSuccessCount?: number;
      scheduleDays?: string[]; scheduleTimeJst?: string;
      discoveryQueries?: string[]; sourceUrls?: string[]; maxLeads?: number;
    }>(request);
    if (!input.name?.trim() || !input.coreMessageJa?.trim() || !input.ctaJa?.trim()) {
      throw new HttpError(400, "CAMPAIGN_FIELDS_REQUIRED");
    }
    const target = input.targetSuccessCount ?? 20;
    if (!Number.isInteger(target) || target < 1 || target > 100) throw new HttpError(400, "INVALID_RUN_TARGET");
    const id = crypto.randomUUID();
    const statements = [env.DB.prepare(
      `INSERT INTO campaigns (id, workspace_id, name, campaign_context, region, core_message_ja, cta_ja,
       target_success_count, schedule_days_json, schedule_time_jst, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAUSED')`
    ).bind(id, input.workspaceId ?? "ws_default", input.name.trim(), input.context ?? null, input.region ?? "全国",
      input.coreMessageJa.trim(), input.ctaJa.trim(), target, JSON.stringify(input.scheduleDays ?? []), input.scheduleTimeJst ?? null)];
    statements.push(env.DB.prepare(
      `UPDATE campaigns SET discovery_queries_json = ?, source_urls_json = ?, max_leads = ? WHERE id = ?`
    ).bind(JSON.stringify((input.discoveryQueries ?? []).filter(Boolean).slice(0, 20)),
      JSON.stringify((input.sourceUrls ?? []).filter(Boolean).slice(0, 20)),
      Math.max(1, Math.min(100, input.maxLeads ?? target)), id));
    for (const productId of input.productIds ?? []) {
      statements.push(env.DB.prepare("INSERT INTO campaign_products (campaign_id, product_id) VALUES (?, ?)").bind(id, productId));
    }
    await env.DB.batch(statements);
    return json({ id }, { status: 201 }, env);
  }

  const start = url.pathname.match(/^\/v1\/campaigns\/([^/]+)\/start$/);
  if (request.method === "POST" && start) {
    return json(await startCampaign(env, start[1]!, "MANUAL"), { status: 201 }, env);
  }
  const pause = url.pathname.match(/^\/v1\/campaigns\/([^/]+)\/pause$/);
  if (request.method === "POST" && pause) {
    await pauseCampaign(env, pause[1]!);
    return json({ ok: true }, {}, env);
  }

  if (url.pathname.startsWith("/internal/")) requireWorker(request, env);
  const discoveryResult = url.pathname.match(/^\/internal\/jobs\/([^/]+)\/discovery-results$/);
  if (request.method === "POST" && discoveryResult) {
    return json(await recordDiscoveryResults(env, discoveryResult[1]!, await body(request)), {}, env);
  }
  const qualificationResult = url.pathname.match(/^\/internal\/jobs\/([^/]+)\/qualification-result$/);
  if (request.method === "POST" && qualificationResult) {
    return json(await recordQualificationResult(env, qualificationResult[1]!, await body(request)), {}, env);
  }
  const outreachResult = url.pathname.match(/^\/internal\/jobs\/([^/]+)\/outreach-result$/);
  if (request.method === "POST" && outreachResult) {
    return json(await recordOutreachResult(env, outreachResult[1]!, await body(request)), {}, env);
  }
  const evidence = url.pathname.match(/^\/internal\/jobs\/([^/]+)\/evidence\/([^/]+)\/(BEFORE_SUBMIT|CONFIRMATION|COMPLETED|ERROR)$/);
  if (request.method === "PUT" && evidence) {
    const workerId = request.headers.get("x-worker-id");
    if (!workerId) throw new HttpError(400, "WORKER_ID_REQUIRED");
    return json(await storeEvidence(env, evidence[1]!, workerId, evidence[2]!, evidence[3]! as import("@kylon/core").EvidenceType, request), {}, env);
  }
  if (request.method === "POST" && url.pathname === "/internal/jobs/claim") {
    const input = await body<{ workerId: string }>(request);
    return json({ job: await claimNextJob(env, input.workerId) }, {}, env);
  }
  if (request.method === "POST" && url.pathname === "/internal/jobs/complete") {
    const input = await body<{ jobId: string; workerId: string }>(request);
    const result = await completeJob(env, input.jobId, input.workerId);
    if (result.meta.changes !== 1) throw new HttpError(409, "JOB_LOCK_MISMATCH");
    return json({ ok: true }, {}, env);
  }
  if (request.method === "POST" && url.pathname === "/internal/jobs/fail") {
    const input = await body<{ jobId: string; workerId: string; code: string; message: string }>(request);
    const result = await failJob(env, input);
    if (result.meta.changes !== 1) throw new HttpError(409, "JOB_LOCK_MISMATCH");
    return json({ ok: true }, {}, env);
  }
  const success = url.pathname.match(/^\/internal\/outreach\/([^/]+)\/success$/);
  if (request.method === "POST" && success) {
    const input = await body<{ workspaceId: string; evidenceKey?: string }>(request);
    return json(await recordSuccessfulOutreach(env, { outreachId: success[1]!, ...input }), {}, env);
  }
  return json({ error: "NOT_FOUND" }, { status: 404 }, env);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await router(request, env);
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.code, message: error.message }, { status: error.status }, env);
      }
      console.error(error);
      return json({ error: "INTERNAL_ERROR" }, { status: 500 }, env);
    }
  },
  async scheduled(controller: ScheduledController, env: Env, context: ExecutionContext) {
    context.waitUntil(runScheduler(env, new Date(controller.scheduledTime)));
  }
} satisfies ExportedHandler<Env>;
