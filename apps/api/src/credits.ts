import type { Env } from "./env";
import { HttpError } from "./http";

export async function recordSuccessfulOutreach(env: Env, input: {
  outreachId: string;
  workspaceId: string;
  evidenceKey?: string;
}) {
  const outreach = await env.DB.prepare(
    "SELECT status, credit_charged FROM outreach_attempts WHERE id = ? AND workspace_id = ?"
  ).bind(input.outreachId, input.workspaceId).first<{ status: string; credit_charged: number }>();
  if (!outreach) throw new HttpError(404, "OUTREACH_NOT_FOUND");
  if (outreach.credit_charged === 1) return { charged: false, idempotent: true };

  const balance = await env.DB.prepare(
    "SELECT trial, subscription, top_up FROM credit_balances WHERE workspace_id = ?"
  ).bind(input.workspaceId).first<{ trial: number; subscription: number; top_up: number }>();
  if (!balance || balance.trial + balance.subscription + balance.top_up < 1) {
    throw new HttpError(409, "INSUFFICIENT_CREDITS");
  }

  const bucket = balance.trial > 0 ? "trial" : balance.subscription > 0 ? "subscription" : "top_up";
  const ledgerId = crypto.randomUUID();
  const statements = [
    env.DB.prepare(
      `UPDATE outreach_attempts SET status = 'SUCCESS', credit_charged = 1,
       processed_at = unixepoch(), updated_at = unixepoch()
       WHERE id = ? AND workspace_id = ? AND credit_charged = 0`
    ).bind(input.outreachId, input.workspaceId),
    env.DB.prepare(`UPDATE credit_balances SET ${bucket} = ${bucket} - 1, updated_at = unixepoch()
      WHERE workspace_id = ? AND ${bucket} > 0`).bind(input.workspaceId),
    env.DB.prepare(
      `INSERT INTO credit_ledger (id, workspace_id, credit_type, amount, reason, reference_id, created_at)
       VALUES (?, ?, ?, -1, 'OUTREACH_SUCCESS', ?, unixepoch())`
    ).bind(ledgerId, input.workspaceId, bucket.toUpperCase(), input.outreachId)
  ];
  if (input.evidenceKey) {
    statements.push(env.DB.prepare(
      `INSERT INTO success_evidence (id, outreach_id, bucket, storage_key, created_at)
       VALUES (?, ?, ?, ?, unixepoch())`
    ).bind(crypto.randomUUID(), input.outreachId, env.EVIDENCE_BUCKET, input.evidenceKey));
  }
  await env.DB.batch(statements);
  return { charged: true, bucket };
}
