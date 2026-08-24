import { ApiClient } from "./api-client";
import { execute } from "./executor";

const apiUrl = process.env.API_URL ?? "http://localhost:8787";
const token = process.env.AUTOMATION_WORKER_TOKEN;
const workerId = process.env.WORKER_ID ?? `worker-${crypto.randomUUID()}`;
const pollInterval = Number(process.env.POLL_INTERVAL_MS ?? 5000);
const dryRun = process.env.DRY_RUN !== "false";

if (!token) throw new Error("AUTOMATION_WORKER_TOKEN is required");
if (!Number.isFinite(pollInterval) || pollInterval < 1000) throw new Error("POLL_INTERVAL_MS must be at least 1000");

const api = new ApiClient(apiUrl, token);
const abort = new AbortController();
process.on("SIGINT", () => abort.abort());
process.on("SIGTERM", () => abort.abort());

console.info("Kylon automation worker started", { workerId, dryRun, apiUrl });

while (!abort.signal.aborted) {
  let job;
  try {
    job = await api.claim(workerId);
    if (job) {
      await execute(job, { dryRun, workerId, api });
      await api.complete(job.id, workerId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    console.error("Worker iteration failed", { jobId: job?.id, message });
    if (job) {
      await api.fail(job.id, workerId, message.split(":")[0]!, message).catch(console.error);
    }
  }

  if (!job) {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, pollInterval);
      abort.signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
    });
  }
}

console.info("Kylon automation worker stopped", { workerId });
