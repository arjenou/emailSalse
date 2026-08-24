import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const USER_AGENT = "KylonOutreachBot/0.1 (+https://email.yingmu-tech.com)";
const lastRequestAt = new Map<string, number>();

function privateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4) return true;
  const [a, b] = parts;
  if (a === undefined) return true;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254)
    || (a === 172 && b !== undefined && b >= 16 && b <= 31) || (a === 192 && b === 168)
    || (a === 100 && b !== undefined && b >= 64 && b <= 127) || a >= 224;
}

function privateIp(address: string) {
  if (isIP(address) === 4) return privateIpv4(address);
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized === "::" || normalized.startsWith("fc")
    || normalized.startsWith("fd") || normalized.startsWith("fe8")
    || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")
    || normalized.startsWith("::ffff:127.") || normalized.startsWith("::ffff:10.")
    || normalized.startsWith("::ffff:192.168.");
}

export async function assertPublicUrl(value: string) {
  const url = new URL(value);
  if (!new Set(["http:", "https:"]).has(url.protocol)) throw new Error("UNSUPPORTED_URL_PROTOCOL");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("PRIVATE_HOST_BLOCKED");
  }
  if (isIP(hostname)) {
    if (privateIp(hostname)) throw new Error("PRIVATE_IP_BLOCKED");
  } else {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (addresses.length === 0 || addresses.some(({ address }) => privateIp(address))) {
      throw new Error("PRIVATE_DNS_RESULT_BLOCKED");
    }
  }
  return url;
}

async function rateLimit(hostname: string) {
  const elapsed = Date.now() - (lastRequestAt.get(hostname) ?? 0);
  if (elapsed < 750) await new Promise((resolve) => setTimeout(resolve, 750 - elapsed));
  lastRequestAt.set(hostname, Date.now());
}

export async function fetchPublic(value: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    let current = await assertPublicUrl(value);
    for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
      await rateLimit(current.hostname);
      const response = await fetch(current, {
        ...init,
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml", ...init.headers }
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) return response;
      const location = response.headers.get("location");
      if (!location) return response;
      current = await assertPublicUrl(new URL(location, current).toString());
    }
    throw new Error("TOO_MANY_REDIRECTS");
  } finally {
    clearTimeout(timeout);
  }
}

export async function robotsAllowed(value: string) {
  const url = await assertPublicUrl(value);
  try {
    const response = await fetchPublic(new URL("/robots.txt", url).toString());
    if (!response.ok) return true;
    const text = await response.text();
    let applies = false;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.replace(/#.*/, "").trim();
      const [key, ...rest] = line.split(":");
      const valuePart = rest.join(":").trim();
      if (key?.toLowerCase() === "user-agent") applies = valuePart === "*" || /kylon/i.test(valuePart);
      if (applies && key?.toLowerCase() === "disallow" && valuePart && url.pathname.startsWith(valuePart)) return false;
    }
  } catch {
    return true;
  }
  return true;
}

export function htmlToText(html: string) {
  return decodeEntities(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

export function decodeEntities(value: string) {
  const entities: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return entities[entity.toLowerCase()] ?? " ";
  });
}

export function extractLinks(html: string, baseUrl: string) {
  const links: Array<{ url: string; text: string }> = [];
  const pattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      const url = new URL(decodeEntities(match[1]!), baseUrl);
      if (!new Set(["http:", "https:"]).has(url.protocol)) continue;
      url.hash = "";
      links.push({ url: url.toString(), text: htmlToText(match[2] ?? "").slice(0, 300) });
    } catch { /* ignore malformed links */ }
  }
  return links;
}
