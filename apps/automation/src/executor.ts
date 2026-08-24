import type { Job } from "@kylon/core";

export interface ExecutionContext {
  dryRun: boolean;
}

export async function execute(job: Job, context: ExecutionContext) {
  switch (job.jobType) {
    case "DISCOVER_LEADS":
      // Provider boundary: connect a search/AI provider here, then enqueue one
      // QUALIFY_LEAD job per normalized company domain.
      console.info("Discovery job accepted", { jobId: job.id, campaignId: job.campaignId });
      return;
    case "QUALIFY_LEAD":
      // Qualification output must include evidence URLs and a 0-100 score.
      console.info("Qualification job accepted", { jobId: job.id });
      return;
    case "SUBMIT_OUTREACH":
      if (context.dryRun) {
        console.info("Dry-run prevented external form submission", { jobId: job.id });
        return;
      }
      throw new Error("LIVE_BROWSER_EXECUTOR_NOT_CONFIGURED");
    default:
      throw new Error(`UNSUPPORTED_JOB_TYPE:${job.jobType}`);
  }
}
