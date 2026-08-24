const apiUrl = process.env.KYLON_API_URL ?? "https://email.api.yingmu-tech.com";

async function forward(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const token = process.env.KYLON_WORKER_TOKEN;
  if (!token) return Response.json({ error: "SERVER_API_TOKEN_NOT_CONFIGURED" }, { status: 503 });
  const { path } = await context.params;
  const source = new URL(request.url);
  const target = new URL(`/${path.join("/")}${source.search}`, apiUrl);
  const headers = new Headers(request.headers);
  headers.set("authorization", `Bearer ${token}`);
  headers.delete("cookie");
  headers.delete("host");
  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
    duplex: "half"
  } as RequestInit & { duplex: "half" });
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("set-cookie");
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  const payload = await response.arrayBuffer();
  return new Response(payload, { status: response.status, headers: responseHeaders });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
