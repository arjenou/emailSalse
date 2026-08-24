import { canStartRun } from "@kylon/core";
import type { Env } from "./env";
import { HttpError } from "./http";

export async function startCampaign(env: Env, campaignId: string, source: "MANUAL" | "SCHEDULED") {
  const campaign = await env.DB.prepare(
    `SELECT c.id, c.workspace_id, c.status, c.target_success_count,
      COALESCE(cb.trial, 0) + COALESCE(cb.subscription, 0) + COALESCE(cb.top_up, 0) AS credits
     FROM campaigns c LEFT JOIN credit_balances cb ON cb.workspace_id = c.workspace_id WHERE c.id = ?`
  ).bind(campaignId).first<{ id: string; workspace_id: string; status: string; target_success_count: number; credits: number }>();
  if (!campaign) throw new HttpError(404, "CAMPAIGN_NOT_FOUND");
  if (campaign.status === "ARCHIVED") throw new HttpError(409, "CAMPAIGN_ARCHIVED");

  const active = await env.DB.prepare(
    "SELECT id FROM campaign_runs WHERE campaign_id = ? AND status = 'ACTIVE' LIMIT 1"
  ).bind(campaignId).first();
  if (active) throw new HttpError(409, "ACTIVE_RUN_EXISTS");
  if (!canStartRun(campaign.credits, campaign.target_success_count)) {
    await env.DB.prepare("UPDATE campaigns SET status = 'PAUSED_INSUFFICIENT_CREDITS' WHERE id = ?")
      .bind(campaignId).run();
    throw new HttpError(409, "INSUFFICIENT_CREDITS");
  }

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
       VALUES (?, ?, ?, ?, 'DISCOVER_LEADS', 'PENDING', 100, '{}', unixepoch(), unixepoch(), unixepoch())`
    ).bind(jobId, campaign.workspace_id, campaignId, runId)
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
