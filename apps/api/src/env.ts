export interface Env {
  DB: D1Database;
  EVIDENCE: R2Bucket;
  APP_ORIGIN: string;
  REQUIRE_API_AUTH: string;
  WORKER_SHARED_SECRET: string;
}
