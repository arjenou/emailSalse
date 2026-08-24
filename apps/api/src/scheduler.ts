import type { Env } from "./env";
import { startCampaign } from "./campaigns";
import { HttpError } from "./http";

interface ScheduledCampaign {
  id: string;
  schedule_days_json: string;
  schedule_time_jst: string;
  skip_japanese_holidays: number;
}

function jstParts(date: Date) {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    day: values.weekday!.toUpperCase(),
    time: `${values.hour}:${values.minute}`
  };
}

export async function runScheduler(env: Env, scheduledAt: Date) {
  const now = jstParts(scheduledAt);
  const campaigns = await env.DB.prepare(
    `SELECT id, schedule_days_json, schedule_time_jst, skip_japanese_holidays
     FROM campaigns WHERE status = 'RUNNING' AND schedule_time_jst = ?`
  ).bind(now.time).all<ScheduledCampaign>();
  const holiday = await env.DB.prepare("SELECT holiday_date FROM japanese_holidays WHERE holiday_date = ?")
    .bind(now.date).first();

  for (const campaign of campaigns.results) {
    const days = JSON.parse(campaign.schedule_days_json) as string[];
    if (!days.includes(now.day)) continue;
    const scheduledKey = `${now.date}T${now.time}+09:00`;
    const fireId = crypto.randomUUID();
    const inserted = await env.DB.prepare(
      `INSERT INTO scheduled_run_fires (id, campaign_id, scheduled_key, status)
       VALUES (?, ?, ?, 'PENDING') ON CONFLICT (campaign_id, scheduled_key) DO NOTHING`
    ).bind(fireId, campaign.id, scheduledKey).run();
    if (inserted.meta.changes !== 1) continue;

    if (holiday && campaign.skip_japanese_holidays === 1) {
      await updateFire(env, fireId, "SKIPPED_HOLIDAY", null, "JAPANESE_HOLIDAY");
      continue;
    }
    try {
      const run = await startCampaign(env, campaign.id, "SCHEDULED");
      await updateFire(env, fireId, "CREATED", run.runId, null);
    } catch (error) {
      const code = error instanceof HttpError ? error.code : "SCHEDULER_ERROR";
      const status = code === "ACTIVE_RUN_EXISTS" ? "SKIPPED_ACTIVE_RUN" : "ERROR";
      await updateFire(env, fireId, status, null, code);
    }
  }
}

function updateFire(env: Env, id: string, status: string, runId: string | null, reason: string | null) {
  return env.DB.prepare(
    "UPDATE scheduled_run_fires SET status = ?, campaign_run_id = ?, reason = ?, updated_at = unixepoch() WHERE id = ?"
  ).bind(status, runId, reason, id).run();
}
