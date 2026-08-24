import { chromium, type Browser, type Locator, type Page } from "playwright";
import type { ApiClient } from "./api-client";
import type { OutreachJobPayload, SenderSnapshot } from "./types";
import { assertPublicUrl } from "./safe-web";

const PROHIBITED_PATTERN = /営業(?:目的|メール|連絡|提案)[^。\n]{0,40}(?:お断り|禁止|ご遠慮)|セールス[^。\n]{0,40}(?:お断り|禁止)|売り込み[^。\n]{0,40}(?:お断り|禁止)/i;
const SUCCESS_PATTERN = /お問い合わせ(?:を)?(?:受け付け|受付|送信)|送信(?:が)?完了|送信しました|ありがとうございました|thank\s*you/i;
const SUCCESS_URL_PATTERN = /thank|thanks|complete|completed|finish|success|contact[_-]?thanks/i;
const CONFIRM_PATTERN = /確認|入力内容を確認|次へ|内容確認/i;
const SUBMIT_PATTERN = /送信|問い合わせる|申し込む|確定/i;

let browserPromise: Promise<Browser> | undefined;
function getBrowser() {
  browserPromise ??= chromium.launch({ headless: process.env.HEADLESS !== "false" });
  return browserPromise;
}

interface FieldDescriptor {
  index: number;
  tag: string;
  type: string;
  label: string;
  required: boolean;
}

function valueFor(label: string, sender: SenderSnapshot, payload: OutreachJobPayload) {
  const value = label.toLowerCase();
  if (/会社|企業|法人|organization|company/.test(value)) return sender.companyNameJa || sender.companyName || sender.companyNameEn;
  if (/フリガナ|ふりがな|カナ|kana/.test(value)) return sender.contactNameKana;
  if (/氏名|お名前|担当者|name/.test(value)) return sender.contactName;
  if (/部署|部門|department/.test(value)) return sender.department;
  if (/役職|肩書|title/.test(value)) return sender.jobTitle;
  if (/メール|mail|e-mail/.test(value)) return sender.email;
  if (/電話|tel|phone/.test(value)) return sender.phone;
  if (/郵便|postal|zip/.test(value)) return sender.postalCode;
  if (/住所|address/.test(value)) return sender.address;
  if (/件名|題名|subject|ご要望アイテム/.test(value)) return payload.subject;
  if (/お問い合わせ内容|お問合せ内容|ご相談内容|メッセージ|本文|内容|message|comment|details/.test(value)) return payload.message;
  return undefined;
}

async function descriptors(page: Page) {
  return page.locator("input, textarea, select").evaluateAll((elements) => elements.map((element, index) => {
    const input = element as HTMLInputElement;
    const explicit = input.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`)?.textContent : "";
    const wrapping = input.closest("label")?.textContent;
    return {
      index,
      tag: input.tagName.toLowerCase(),
      type: (input.getAttribute("type") ?? "text").toLowerCase(),
      label: [explicit, wrapping, input.getAttribute("aria-label"), input.getAttribute("placeholder"), input.name, input.id]
        .filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
      required: input.required || input.getAttribute("aria-required") === "true"
    };
  })) as Promise<FieldDescriptor[]>;
}

async function fillText(locator: Locator, value: string) {
  try { await locator.fill(value, { timeout: 4_000 }); }
  catch {
    await locator.click({ timeout: 4_000 });
    await locator.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
    await locator.page().keyboard.insertText(value);
  }
}

async function visibleCaptcha(page: Page) {
  const candidates = page.locator('iframe[src*="recaptcha/api2/anchor"], iframe[src*="hcaptcha.com"], .h-captcha, .g-recaptcha:not([data-size="invisible"])');
  for (let index = 0; index < await candidates.count(); index += 1) {
    if (await candidates.nth(index).isVisible().catch(() => false)) return true;
  }
  return false;
}

async function fillForm(page: Page, payload: OutreachJobPayload) {
  const fields = page.locator("input, textarea, select");
  const unknownRequired: string[] = [];
  for (const field of await descriptors(page)) {
    if (["hidden", "submit", "button", "reset", "file", "image"].includes(field.type)) continue;
    const locator = fields.nth(field.index);
    if (!await locator.isVisible().catch(() => false)) continue;
    if (field.type === "checkbox") {
      if (/同意|個人情報|プライバシー|privacy|agree/i.test(field.label)) await locator.check();
      else if (field.required) unknownRequired.push(field.label);
      continue;
    }
    if (field.type === "radio") {
      if (field.required && !await locator.isChecked()) await locator.check();
      continue;
    }
    if (field.tag === "select") {
      if (field.required) {
        const options = await locator.locator("option").all();
        for (const option of options) {
          const value = await option.getAttribute("value");
          if (value) { await locator.selectOption(value); break; }
        }
      }
      continue;
    }
    const value = valueFor(field.label, payload.sender, payload);
    if (value) await fillText(locator, String(value));
    else if (field.required) unknownRequired.push(field.label || `field-${field.index}`);
  }
  if (unknownRequired.length) throw new Error(`UNMAPPED_REQUIRED_FIELDS:${unknownRequired.slice(0, 5).join("|")}`);
}

async function actionButton(page: Page, pattern: RegExp) {
  const controls = page.locator('button, input[type="submit"], input[type="button"]');
  for (let index = 0; index < await controls.count(); index += 1) {
    const control = controls.nth(index);
    if (!await control.isVisible().catch(() => false)) continue;
    const text = `${await control.innerText().catch(() => "")} ${await control.getAttribute("value") ?? ""}`;
    if (pattern.test(text)) return control;
  }
  return null;
}

async function settle(page: Page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
}

export async function executeOutreach(input: {
  jobId: string;
  workerId: string;
  payload: OutreachJobPayload;
  api: ApiClient;
  dryRun: boolean;
}) {
  const browser = await getBrowser();
  const context = await browser.newContext({ locale: "ja-JP", timezoneId: "Asia/Tokyo" });
  await context.route("**/*", async (route) => {
    const url = route.request().url();
    if (!/^https?:/i.test(url)) return route.continue();
    try { await assertPublicUrl(url); await route.continue(); }
    catch { await route.abort("blockedbyclient"); }
  });
  const page = await context.newPage();
  try {
    await page.goto(input.payload.contactFormUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const pageText = await page.locator("body").innerText();
    if (PROHIBITED_PATTERN.test(pageText)) {
      return { result: "SKIPPED" as const, reason: "CONTACT_POLICY_PROHIBITED" };
    }
    if (await visibleCaptcha(page)) return { result: "SKIPPED" as const, reason: "VISIBLE_CAPTCHA_REQUIRES_MANUAL_REVIEW" };
    await fillForm(page, input.payload);
    const before = await page.screenshot({ fullPage: true, type: "png" });
    await input.api.uploadEvidence(input.jobId, input.workerId, input.payload.outreachId, "BEFORE_SUBMIT", before);
    if (input.dryRun) return { result: "DRY_RUN" as const, reason: "Form filled and captured without submission" };

    let button = await actionButton(page, CONFIRM_PATTERN) ?? await actionButton(page, SUBMIT_PATTERN);
    if (!button) throw new Error("SUBMIT_CONTROL_NOT_FOUND");
    if (await visibleCaptcha(page)) return { result: "SKIPPED" as const, reason: "VISIBLE_CAPTCHA_REQUIRES_MANUAL_REVIEW" };
    await button.click();
    await settle(page);

    let text = await page.locator("body").innerText();
    if (!SUCCESS_PATTERN.test(text) && !SUCCESS_URL_PATTERN.test(page.url())) {
      const confirm = await page.screenshot({ fullPage: true, type: "png" });
      await input.api.uploadEvidence(input.jobId, input.workerId, input.payload.outreachId, "CONFIRMATION", confirm);
      if (await visibleCaptcha(page)) return { result: "SKIPPED" as const, reason: "VISIBLE_CAPTCHA_REQUIRES_MANUAL_REVIEW" };
      button = await actionButton(page, SUBMIT_PATTERN);
      if (!button) return { result: "FAILED" as const, reason: "SUBMISSION_STATE_UNCERTAIN_AFTER_CONFIRMATION" };
      await button.click();
      await settle(page);
      text = await page.locator("body").innerText();
    }

    const success = SUCCESS_PATTERN.test(text) || SUCCESS_URL_PATTERN.test(page.url());
    const completed = await page.screenshot({ fullPage: true, type: "png" });
    await input.api.uploadEvidence(input.jobId, input.workerId, input.payload.outreachId,
      success ? "COMPLETED" : "ERROR", completed);
    if (!success) return { result: "FAILED" as const, reason: "SUCCESS_NOT_VERIFIED" };
    return { result: "SUCCESS" as const, successUrl: page.url(), successText: text.match(SUCCESS_PATTERN)?.[0] };
  } catch (error) {
    const screenshot = await page.screenshot({ fullPage: true, type: "png" }).catch(() => null);
    if (screenshot) await input.api.uploadEvidence(input.jobId, input.workerId, input.payload.outreachId, "ERROR", screenshot).catch(() => undefined);
    throw error;
  } finally {
    await context.close();
  }
}
