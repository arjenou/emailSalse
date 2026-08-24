import type { Env } from "./env";
import { body, HttpError, json, requireWorker } from "./http";
import { claimNextJob, completeJob, failJob } from "./jobs";
import { pauseCampaign, startCampaign } from "./campaigns";
import { recordSuccessfulOutreach } from "./credits";
import { runScheduler } from "./scheduler";

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
    const [campaigns, outreach, balance] = await Promise.all([
      env.DB.prepare("SELECT status, COUNT(*) count FROM campaigns GROUP BY status").all(),
      env.DB.prepare("SELECT status, COUNT(*) count FROM outreach_attempts GROUP BY status").all(),
      env.DB.prepare("SELECT COALESCE(SUM(trial + subscription + top_up), 0) available FROM credit_balances").first()
    ]);
    return json({ campaigns: campaigns.results, outreach: outreach.results, credits: balance }, {}, env);
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
    ).bind(id, input.workspaceId ?? "ws_demo", input.name.trim(), input.description.trim(), input.advantages ?? null,
      input.serviceType ?? null, input.productUrl ?? null, input.moq ?? null, input.leadTime ?? null).run();
    return json({ id }, { status: 201 }, env);
  }

  if (request.method === "POST" && url.pathname === "/v1/campaigns") {
    const input = await body<{
      workspaceId?: string; name?: string; context?: string; region?: string; productIds?: string[];
      coreMessageJa?: string; ctaJa?: string; targetSuccessCount?: number;
      scheduleDays?: string[]; scheduleTimeJst?: string;
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
    ).bind(id, input.workspaceId ?? "ws_demo", input.name.trim(), input.context ?? null, input.region ?? "全国",
      input.coreMessageJa.trim(), input.ctaJa.trim(), target, JSON.stringify(input.scheduleDays ?? []), input.scheduleTimeJst ?? null)];
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
