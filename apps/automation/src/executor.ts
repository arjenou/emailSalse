import type { Job } from "@kylon/core";
import type { ApiClient } from "./api-client";
import { discover } from "./discovery";
import { qualify } from "./qualification";
import { executeOutreach } from "./outreach";
import type { DiscoveryJobPayload, OutreachJobPayload, QualificationJobPayload } from "./types";

export interface ExecutionContext {
  dryRun: boolean;
  workerId: string;
  api: ApiClient;
}

export async function execute(job: Job, context: ExecutionContext) {
  switch (job.jobType) {
    case "DISCOVER_LEADS":
      const discovery = await discover(job.payload as DiscoveryJobPayload);
      await context.api.discoveryResults(job.id, { workerId: context.workerId, ...discovery });
      console.info("Discovery completed", { jobId: job.id, sources: discovery.sources.length, companies: discovery.companies.length });
      return;
    case "QUALIFY_LEAD":
      const qualification = await qualify(job.payload as QualificationJobPayload);
      await context.api.qualificationResult(job.id, {
        workerId: context.workerId,
        leadId: (job.payload as QualificationJobPayload).leadId,
        ...qualification
      });
      console.info("Qualification completed", { jobId: job.id, score: qualification.score, policy: qualification.policyStatus });
      return;
    case "SUBMIT_OUTREACH":
      const outreach = await executeOutreach({
        jobId: job.id,
        workerId: context.workerId,
        payload: job.payload as OutreachJobPayload,
        api: context.api,
        dryRun: context.dryRun
      });
      await context.api.outreachResult(job.id, {
        workerId: context.workerId,
        outreachId: (job.payload as OutreachJobPayload).outreachId,
        ...outreach
      });
      console.info("Outreach processed", { jobId: job.id, result: outreach.result });
      return;
    default:
      throw new Error(`UNSUPPORTED_JOB_TYPE:${job.jobType}`);
  }
}
