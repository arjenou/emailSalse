import "server-only";

const apiUrl = process.env.KYLON_API_URL ?? "https://email.api.yingmu-tech.com";

export async function apiGet<T>(path: string): Promise<T> {
  const token = process.env.KYLON_WORKER_TOKEN;
  if (!token) throw new Error("KYLON_WORKER_TOKEN_NOT_CONFIGURED");
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? `API_${response.status}`);
  return result;
}
