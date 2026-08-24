export type CampaignStatus =
  | "RUNNING"
  | "PAUSED"
  | "PAUSED_INSUFFICIENT_CREDITS"
  | "ARCHIVED";

export type RunStatus = "ACTIVE" | "COMPLETED" | "ENDED" | "CANCELLED";
export type RunSource = "SCHEDULED" | "MANUAL" | "CONFIG_CHANGED" | "WORKSPACE_CONFIG_CHANGED";
export type JobStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
export type OutreachStatus = "SUCCESS" | "FAILED" | "SKIPPED";

export interface Job<T = unknown> {
  id: string;
  workspaceId: string;
  campaignId: string | null;
  campaignRunId: string | null;
  outreachId: string | null;
  jobType: string;
  status: JobStatus;
  payload: T;
  attemptCount: number;
}

export interface JobQueue {
  enqueue(input: Omit<Job, "status" | "attemptCount">): Promise<void>;
  claim(workerId: string): Promise<Job | null>;
  complete(jobId: string, workerId: string): Promise<void>;
  fail(jobId: string, workerId: string, errorCode: string, errorMessage: string): Promise<void>;
  cancel(jobId: string): Promise<void>;
}

export function canStartRun(availableCredits: number, targetSuccessCount: number) {
  return Number.isInteger(targetSuccessCount) && targetSuccessCount > 0 && availableCredits >= targetSuccessCount;
}

export function shouldChargeCredit(status: OutreachStatus, alreadyCharged: boolean) {
  return status === "SUCCESS" && !alreadyCharged;
}

export function isQualifiedLead(score: number) {
  return Number.isFinite(score) && score >= 80 && score <= 100;
}

export function normalizeDomain(value: string) {
  const url = new URL(value.startsWith("http") ? value : `https://${value}`);
  return url.hostname.toLowerCase().replace(/^www\./, "");
}
