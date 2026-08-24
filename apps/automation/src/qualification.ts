import { extractLinks, fetchPublic, htmlToText, robotsAllowed } from "./safe-web";
import type { QualificationJobPayload } from "./types";

const CONTACT_PATTERN = /contact|inquiry|お問い合わせ|お問合せ|問合せ|ご相談|連絡/i;
const PROHIBITED_PATTERN = /営業(?:目的|メール|連絡|提案)[^。\n]{0,40}(?:お断り|禁止|ご遠慮)|セールス[^。\n]{0,40}(?:お断り|禁止)|売り込み[^。\n]{0,40}(?:お断り|禁止)/i;

function keywords(payload: QualificationJobPayload) {
  const text = [payload.context, payload.region, ...payload.queries,
    ...payload.products.flatMap((product) => [product.name, product.description, product.advantages ?? "", product.service_type ?? ""])
  ].join(" ");
  return [...new Set(text.split(/[\s,，、/・。]+/).map((value) => value.trim()).filter((value) => value.length >= 2))].slice(0, 30);
}

export async function qualify(payload: QualificationJobPayload) {
  if (!(await robotsAllowed(payload.websiteUrl))) {
    return { score: 0, reason: "官网 robots.txt 不允许抓取", policyStatus: "UNKNOWN" as const };
  }
  const response = await fetchPublic(payload.websiteUrl);
  if (!response.ok) throw new Error(`WEBSITE_HTTP_${response.status}`);
  const html = (await response.text()).slice(0, 2_000_000);
  const text = htmlToText(html).slice(0, 100_000);
  const terms = keywords(payload);
  const matches = terms.filter((term) => text.toLowerCase().includes(term.toLowerCase())).slice(0, 8);
  const links = extractLinks(html, payload.websiteUrl);
  let contact = links.find((link) => CONTACT_PATTERN.test(`${link.text} ${link.url}`));
  if (!contact) {
    for (const path of ["/contact", "/inquiry", "/contact-us", "/お問い合わせ"]) {
      const candidate = new URL(path, payload.websiteUrl).toString();
      try {
        const check = await fetchPublic(candidate, { method: "GET" });
        if (check.ok && /<form\b/i.test(await check.text())) { contact = { url: candidate, text: "contact" }; break; }
      } catch { /* try next conventional path */ }
    }
  }
  if (!contact) {
    return { score: Math.min(75, 45 + matches.length * 6), reason: `官网有效，匹配 ${matches.join("、") || "较少"}，但未找到联系表单`, policyStatus: "UNKNOWN" as const };
  }
  const contactResponse = await fetchPublic(contact.url);
  const contactHtml = contactResponse.ok ? (await contactResponse.text()).slice(0, 1_000_000) : "";
  const contactText = htmlToText(contactHtml);
  if (PROHIBITED_PATTERN.test(contactText)) {
    return { score: 0, reason: "联系页面明确禁止营业或推销联系", contactFormUrl: contact.url,
      policyStatus: "PROHIBITED" as const, policyReason: contactText.match(PROHIBITED_PATTERN)?.[0] };
  }
  const hasForm = /<form\b/i.test(contactHtml);
  const score = Math.min(100, 55 + matches.length * 6 + (hasForm ? 15 : 0));
  const reason = `官网业务内容匹配 ${matches.join("、") || "基础行业特征"}；${hasForm ? "已确认联系表单" : "联系页未检测到标准表单"}`;
  const concise = (payload.description || text).replace(/\s+/g, " ").slice(0, 90);
  return {
    score,
    reason,
    personalizedIntro: `貴社のウェブサイトで${concise}を拝見し、ご連絡いたしました。`,
    contactFormUrl: contact.url,
    policyStatus: hasForm ? "ALLOWED" as const : "UNKNOWN" as const
  };
}
