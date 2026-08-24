import type { Job } from "@kylon/core";

export class ApiClient {
  constructor(private baseUrl: string, private token: string) {}

  private async post<T>(path: string, value: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(value)
    });
    const result = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(result.error ?? `API_${response.status}`);
    return result;
  }

  async claim(workerId: string) {
    const result = await this.post<{ job: Job | null }>("/internal/jobs/claim", { workerId });
    return result.job;
  }

  complete(jobId: string, workerId: string) {
    return this.post("/internal/jobs/complete", { jobId, workerId });
  }

  fail(jobId: string, workerId: string, code: string, message: string) {
    return this.post("/internal/jobs/fail", { jobId, workerId, code, message });
  }
}
