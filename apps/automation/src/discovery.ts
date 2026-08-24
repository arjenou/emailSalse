import type { DiscoveryJobPayload } from "./types";
import { extractLinks, fetchPublic, htmlToText, robotsAllowed } from "./safe-web";

interface SearchResult { title: string; url: string; description?: string }
interface SourceResult { url: string; query?: string; title?: string; sourceType: "DIRECTORY" | "EXHIBITION" | "ASSOCIATION" | "SEARCH_RESULT" | "MANUAL"; status?: "DISCOVERED" | "FETCHED" | "FAILED" | "BLOCKED"; errorMessage?: string }
interface CompanyResult { name: string; websiteUrl: string; description?: string; sourceUrl?: string }

const DIRECTORY_CUES = /一覧|名簿|出展社|会員|企業情報|メーカー|卸|問屋|directory|exhibitor|member/i;
const COMPANY_CUES = /株式会社|有限会社|合同会社|Inc\.?|Corporation|Company|Co\.,?\s*Ltd/i;
const CONTACT_CUES = /会社概要|企業情報|公式|ホームページ|website|コーポレート/i;
const BLOCKED_HOSTS = new Set(["facebook.com", "instagram.com", "linkedin.com", "x.com", "twitter.com", "youtube.com", "amazon.co.jp", "rakuten.co.jp"]);

function generatedQueries(payload: DiscoveryJobPayload) {
  if (payload.queries.length) return payload.queries;
  const terms = payload.products.flatMap((product) => [product.name, product.service_type ?? ""])
    .filter(Boolean).slice(0, 3).join(" ");
  const base = terms || payload.context || "日本企業";
  return [`${base} メーカー 企業一覧`, `${base} 卸 問屋 一覧`, `${base} 展示会 出展社`, `${base} 業界団体 会員一覧`];
}

async function braveSearch(query: string): Promise<SearchResult[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return [];
  const params = new URLSearchParams({ q: query, count: "10", country: "JP", search_lang: "jp", ui_lang: "ja-JP" });
  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: { accept: "application/json", "x-subscription-token": key }
  });
  if (!response.ok) throw new Error(`SEARCH_API_${response.status}`);
  const data = await response.json() as { web?: { results?: Array<{ title: string; url: string; description?: string }> } };
  return data.web?.results ?? [];
}

function sourceType(title: string, url: string): SourceResult["sourceType"] {
  const value = `${title} ${url}`;
  if (/展示会|見本市|出展社|exhibitor/i.test(value)) return "EXHIBITION";
  if (/協会|組合|会員|association/i.test(value)) return "ASSOCIATION";
  if (DIRECTORY_CUES.test(value)) return "DIRECTORY";
  return "SEARCH_RESULT";
}

function likelyOfficial(link: { url: string; text: string }, sourceHost: string) {
  const host = new URL(link.url).hostname.replace(/^www\./, "");
  if (host === sourceHost || BLOCKED_HOSTS.has(host)) return false;
  return COMPANY_CUES.test(link.text) || CONTACT_CUES.test(link.text) || /\.co\.jp$|\.jp$/.test(host);
}

async function crawlSource(source: SourceResult, limit: number): Promise<CompanyResult[]> {
  if (!(await robotsAllowed(source.url))) {
    source.status = "BLOCKED";
    source.errorMessage = "ROBOTS_DISALLOWED";
    return [];
  }
  try {
    const response = await fetchPublic(source.url);
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const html = (await response.text()).slice(0, 2_000_000);
    const sourceHost = new URL(source.url).hostname.replace(/^www\./, "");
    const direct = extractLinks(html, source.url).filter((link) => likelyOfficial(link, sourceHost));
    source.status = "FETCHED";
    return direct.slice(0, limit).map((link) => ({
      name: link.text.replace(/\s*[|｜].*$/, "").trim() || new URL(link.url).hostname,
      websiteUrl: link.url,
      description: htmlToText(html).slice(0, 500),
      sourceUrl: source.url
    }));
  } catch (error) {
    source.status = "FAILED";
    source.errorMessage = error instanceof Error ? error.message : "SOURCE_FETCH_FAILED";
    return [];
  }
}

export async function discover(payload: DiscoveryJobPayload) {
  const sources: SourceResult[] = payload.sourceUrls.map((url) => ({ url, sourceType: "MANUAL" }));
  for (const query of generatedQueries(payload).slice(0, 8)) {
    for (const result of await braveSearch(query)) {
      if (!DIRECTORY_CUES.test(`${result.title} ${result.description ?? ""} ${result.url}`)) continue;
      sources.push({ url: result.url, query, title: result.title, sourceType: sourceType(result.title, result.url) });
    }
  }
  const uniqueSources = [...new Map(sources.map((source) => [source.url, source])).values()].slice(0, 20);
  const companies: CompanyResult[] = [];
  for (const source of uniqueSources) {
    companies.push(...await crawlSource(source, payload.maxLeads - companies.length));
    if (companies.length >= payload.maxLeads) break;
  }
  const uniqueCompanies = [...new Map(companies.map((company) => {
    try { return [new URL(company.websiteUrl).hostname.replace(/^www\./, ""), company] as const; }
    catch { return [company.websiteUrl, company] as const; }
  })).values()].slice(0, payload.maxLeads);
  return { sources: uniqueSources, companies: uniqueCompanies };
}
