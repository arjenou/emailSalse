import type { Job } from "@kylon/core";
import type { Env } from "./env";

interface JobRow {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  campaign_run_id: string | null;
  outreach_id: string | null;
  job_type: string;
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
  const candidate = await env.DB.prepare(
    `SELECT id FROM jobs
     WHERE status = 'PENDING' AND available_at <= unixepoch()
     ORDER BY priority DESC, created_at ASC LIMIT 1`
  ).first<{ id: string }>();
  if (!candidate) return null;

  const claimed = await env.DB.prepare(
    `UPDATE jobs SET status = 'RUNNING', locked_at = unixepoch(), locked_by = ?,
      attempt_count = attempt_count + 1, updated_at = unixepoch()
     WHERE id = ? AND status = 'PENDING'`
  ).bind(workerId, candidate.id).run();
  if (claimed.meta.changes !== 1) return null;

  const row = await env.DB.prepare("SELECT * FROM jobs WHERE id = ?")
    .bind(candidate.id).first<JobRow>();
  return row ? toJob(row) : null;
}

export async function completeJob(env: Env, jobId: string, workerId: string) {
  return env.DB.prepare(
    `UPDATE jobs SET status = 'SUCCESS', locked_at = NULL, locked_by = NULL, updated_at = unixepoch()
     WHERE id = ? AND status = 'RUNNING' AND locked_by = ?`
  ).bind(jobId, workerId).run();
}

export async function failJob(env: Env, input: { jobId: string; workerId: string; code: string; message: string }) {
  return env.DB.prepare(
    `UPDATE jobs SET status = 'FAILED', error_code = ?, error_message = ?,
      locked_at = NULL, locked_by = NULL, updated_at = unixepoch()
     WHERE id = ? AND status = 'RUNNING' AND locked_by = ?`
  ).bind(input.code, input.message.slice(0, 1000), input.jobId, input.workerId).run();
}
