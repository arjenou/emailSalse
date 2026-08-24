"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
const inputClass = "min-h-11 rounded-xl border border-[var(--line)] bg-[var(--background)] px-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

export function CampaignForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const data = new FormData(event.currentTarget);
    const payload = Object.fromEntries(data) as Record<string, string>;
    try {
      const response = await fetch(`${apiUrl}/v1/campaigns`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, productIds: ["prod_bags"], targetSuccessCount: Number(payload.targetSuccessCount), scheduleDays: ["MON", "WED", "FRI"] })
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "保存失败");
      router.push("/dashboard/campaigns"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "保存失败"); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="max-w-3xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">Campaign 名称<input required name="name" className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">补充说明（可选）<textarea name="context" rows={3} className={`${inputClass} py-3`} /></label>
      <label className="grid gap-2 text-sm font-medium">地区<select name="region" className={inputClass}><option>全国</option><option>关东</option><option>关西</option><option>东京</option><option>大阪</option></select></label>
      <label className="grid gap-2 text-sm font-medium">每次成功目标<input required name="targetSuccessCount" type="number" min="1" max="100" defaultValue="20" className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">日文核心文案<textarea required name="coreMessageJa" rows={5} className={`${inputClass} py-3`} /></label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">日文 CTA<textarea required name="ctaJa" rows={3} className={`${inputClass} py-3`} /></label>
      <label className="grid gap-2 text-sm font-medium">计划时间（JST）<input name="scheduleTimeJst" type="time" defaultValue="09:30" className={inputClass} /></label>
    </div>
    {error && <p role="alert" className="mt-5 text-sm text-[var(--danger)]">{error}</p>}
    <button disabled={pending} className="mt-6 min-h-11 rounded-xl bg-[var(--foreground)] px-5 text-sm font-semibold text-[var(--background)] transition-transform duration-150 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">{pending ? "创建中" : "创建 Campaign"}</button>
  </form>;
}
