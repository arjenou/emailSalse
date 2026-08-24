import type { Job, JobType } from "@kylon/core";
import type { Env } from "./env";

interface JobRow {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  campaign_run_id: string | null;
  outreach_id: string | null;
  job_type: JobType;
  status: Job["status"];
  payload_json: string;
  attempt_count: number;
}

function toJob(row: JobRow): Job {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    campaignId: row.campaign_id,
    campaignRunId: row.campaign_run_id,
    outreachId: row.outreach_id,
    jobType: row.job_type,
    status: row.status,
    payload: JSON.parse(row.payload_json),
    attemptCount: row.attempt_count
  };
}

export async function claimNextJob(env: Env, workerId: string) {
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE jobs SET status = 'PENDING', locked_at = NULL, locked_by = NULL, lease_expires_at = NULL,
       available_at = unixepoch() + 30, updated_at = unixepoch(), error_code = 'LEASE_EXPIRED'
       WHERE status = 'RUNNING' AND lease_expires_at < unixepoch()
       AND job_type != 'SUBMIT_OUTREACH' AND attempt_count < max_attempts`
    ),
    env.DB.prepare(
      `UPDATE jobs SET status = 'FAILED', locked_at = NULL, locked_by = NULL, lease_expires_at = NULL,
       updated_at = unixepoch(), error_code = 'SUBMISSION_LEASE_EXPIRED',
       error_message = 'Submission state is uncertain and requires manual review'
       WHERE status = 'RUNNING' AND lease_expires_at < unixepoch() AND job_type = 'SUBMIT_OUTREACH'`
    )
  ]);

  const candidate = await env.DB.prepare(
    `SELECT id FROM jobs
     WHERE status = 'PENDING' AND available_at <= unixepoch()
     ORDER BY priority DESC, created_at ASC LIMIT 1`
  ).first<{ id: string }>();
  if (!candidate) return null;

  const claimed = await env.DB.prepare(
    `UPDATE jobs SET status = 'RUNNING', locked_at = unixepoch(), locked_by = ?, lease_expires_at = unixepoch() + 300,
      attempt_count = attempt_count + 1, updated_at = unixepoch()
     WHERE id = ? AND status = 'PENDING'`
  ).bind(workerId, candidate.id).run();
  if (claimed.meta.changes !== 1) return null;

  const row = await env.DB.prepare("SELECT * FROM jobs WHERE id = ?")
    .bind(candidate.id).first<JobRow>();
  return row ? toJob(row) : null;
}

export async function completeJob(env: Env, jobId: string, workerId: string) {
  const job = await env.DB.prepare("SELECT campaign_run_id FROM jobs WHERE id = ?").bind(jobId)
    .first<{ campaign_run_id: string | null }>();
  const result = await env.DB.prepare(
    `UPDATE jobs SET status = 'SUCCESS', locked_at = NULL, locked_by = NULL, lease_expires_at = NULL, updated_at = unixepoch()
     WHERE id = ? AND status = 'RUNNING' AND locked_by = ?`
  ).bind(jobId, workerId).run();
  if (result.meta.changes === 1 && job?.campaign_run_id) await finalizeRunIfIdle(env, job.campaign_run_id);
  return result;
}

export async function failJob(env: Env, input: { jobId: string; workerId: string; code: string; message: string }) {
  const job = await env.DB.prepare(
    "SELECT job_type, attempt_count, max_attempts, campaign_run_id FROM jobs WHERE id = ? AND locked_by = ?"
  ).bind(input.jobId, input.workerId).first<{
    job_type: JobType;
    attempt_count: number;
    max_attempts: number;
    campaign_run_id: string | null;
  }>();
  if (!job) return { meta: { changes: 0 } };

  const retryable = job.job_type !== "SUBMIT_OUTREACH" && job.attempt_count < job.max_attempts;
  const result = await env.DB.prepare(
    `UPDATE jobs SET status = ?, error_code = ?, error_message = ?,
      available_at = CASE WHEN ? = 'PENDING' THEN unixepoch() + MIN(300, 30 * attempt_count) ELSE available_at END,
      locked_at = NULL, locked_by = NULL, lease_expires_at = NULL, updated_at = unixepoch()
     WHERE id = ? AND status = 'RUNNING' AND locked_by = ?`
  ).bind(retryable ? "PENDING" : "FAILED", input.code, input.message.slice(0, 1000),
    retryable ? "PENDING" : "FAILED", input.jobId, input.workerId).run();
  if (!retryable && result.meta.changes === 1 && job.campaign_run_id) {
    await finalizeRunIfIdle(env, job.campaign_run_id);
  }
  return result;
}

async function finalizeRunIfIdle(env: Env, runId: string) {
  const active = await env.DB.prepare(
    "SELECT id FROM jobs WHERE campaign_run_id = ? AND status IN ('PENDING', 'RUNNING') LIMIT 1"
  ).bind(runId).first();
  if (active) return;
  await env.DB.prepare(
    `UPDATE campaign_runs SET status = 'COMPLETED', completed_at = unixepoch(),
     success_count = (SELECT COUNT(*) FROM outreach_attempts WHERE campaign_run_id = ? AND status = 'SUCCESS')
     WHERE id = ? AND status = 'ACTIVE'`
  ).bind(runId, runId).run();
}
