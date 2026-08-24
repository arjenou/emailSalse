import type { Env } from "./env";
import { HttpError } from "./http";

export async function startCampaign(env: Env, campaignId: string, source: "MANUAL" | "SCHEDULED") {
  const campaign = await env.DB.prepare(
    `SELECT id, workspace_id, status, target_success_count, campaign_context, region,
      discovery_queries_json, source_urls_json, max_leads
     FROM campaigns WHERE id = ?`
  ).bind(campaignId).first<{
    id: string;
    workspace_id: string;
    status: string;
    target_success_count: number;
    campaign_context: string | null;
    region: string;
    discovery_queries_json: string;
    source_urls_json: string;
    max_leads: number;
  }>();
  if (!campaign) throw new HttpError(404, "CAMPAIGN_NOT_FOUND");
  if (campaign.status === "ARCHIVED") throw new HttpError(409, "CAMPAIGN_ARCHIVED");

  const active = await env.DB.prepare(
    "SELECT id FROM campaign_runs WHERE campaign_id = ? AND status = 'ACTIVE' LIMIT 1"
  ).bind(campaignId).first();
  if (active) throw new HttpError(409, "ACTIVE_RUN_EXISTS");

  const products = await env.DB.prepare(
    `SELECT p.name, p.description, p.advantages, p.service_type
     FROM products p JOIN campaign_products cp ON cp.product_id = p.id
     WHERE cp.campaign_id = ?`
  ).bind(campaignId).all<{ name: string; description: string; advantages: string | null; service_type: string | null }>();

  const runId = crypto.randomUUID();
  const jobId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO campaign_runs (id, campaign_id, source, target_success_count, status, config_version, started_at, created_at)
       SELECT ?, id, ?, target_success_count, 'ACTIVE', config_version, unixepoch(), unixepoch() FROM campaigns WHERE id = ?`
    ).bind(runId, source, campaignId),
    env.DB.prepare("UPDATE campaigns SET status = 'RUNNING', updated_at = unixepoch() WHERE id = ?").bind(campaignId),
    env.DB.prepare(
      `INSERT INTO jobs (id, workspace_id, campaign_id, campaign_run_id, job_type, status, priority, payload_json, available_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'DISCOVER_LEADS', 'PENDING', 100, ?, unixepoch(), unixepoch(), unixepoch())`
    ).bind(jobId, campaign.workspace_id, campaignId, runId, JSON.stringify({
      campaignId,
      campaignRunId: runId,
      workspaceId: campaign.workspace_id,
      context: campaign.campaign_context ?? "",
      region: campaign.region,
      queries: JSON.parse(campaign.discovery_queries_json),
      sourceUrls: JSON.parse(campaign.source_urls_json),
      maxLeads: campaign.max_leads,
      products: products.results
    }))
  ]);
  return { runId, jobId };
}

export async function pauseCampaign(env: Env, campaignId: string) {
  await env.DB.batch([
    env.DB.prepare("UPDATE campaigns SET status = 'PAUSED', updated_at = unixepoch() WHERE id = ?").bind(campaignId),
    env.DB.prepare(
      `UPDATE campaign_runs SET status = 'ENDED', ended_reason = 'USER_PAUSE', completed_at = unixepoch()
       WHERE campaign_id = ? AND status = 'ACTIVE'`
    ).bind(campaignId),
    env.DB.prepare(
      `UPDATE jobs SET status = 'CANCELLED', updated_at = unixepoch()
       WHERE campaign_id = ? AND status IN ('PENDING', 'RUNNING')`
    ).bind(campaignId)
  ]);
}
