import type { Env } from "./env";

export function json(data: unknown, init: ResponseInit = {}, env?: Env) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  if (env) {
    headers.set("access-control-allow-origin", env.APP_ORIGIN);
    headers.set("access-control-allow-headers", "content-type, authorization");
    headers.set("access-control-allow-methods", "GET, POST, PATCH, OPTIONS");
  }
  return new Response(JSON.stringify(data), { ...init, headers });
}

export async function body<T>(request: Request): Promise<T> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new HttpError(415, "CONTENT_TYPE_REQUIRED");
  return request.json<T>();
}

export class HttpError extends Error {
  constructor(public status: number, public code: string, message = code) {
    super(message);
  }
}

export function requireWorker(request: Request, env: Env) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token !== env.WORKER_SHARED_SECRET) throw new HttpError(401, "UNAUTHORIZED");
}
