"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const inputClass = "min-h-11 rounded-xl border border-[var(--line)] bg-[var(--background)] px-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

export function CampaignForm({ products }: { products: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const data = new FormData(event.currentTarget);
    const payload = Object.fromEntries(data) as Record<string, string>;
    try {
      const response = await fetch(`/api/kylon/v1/campaigns`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...payload,
          productIds: data.getAll("productIds").map(String),
          targetSuccessCount: Number(payload.targetSuccessCount),
          maxLeads: Number(payload.maxLeads),
          discoveryQueries: (payload.discoveryQueries ?? "").split("\n").map((value) => value.trim()).filter(Boolean),
          sourceUrls: (payload.sourceUrls ?? "").split("\n").map((value) => value.trim()).filter(Boolean),
          scheduleDays: []
        })
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
      <fieldset className="grid gap-3 sm:col-span-2"><legend className="text-sm font-medium">使用的产品（可多选）</legend>{products.length ? products.map((product) => <label key={product.id} className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--line)] px-3 text-sm"><input type="checkbox" name="productIds" value={product.id} className="size-4 accent-[var(--accent-strong)]" />{product.name}</label>) : <p className="text-xs text-[var(--muted)]">尚无产品，也可以仅使用 Campaign 说明运行。</p>}</fieldset>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">补充说明（可选）<textarea name="context" rows={3} className={`${inputClass} py-3`} /></label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">搜索关键词（每行一个）<textarea name="discoveryQueries" rows={4} placeholder="例：東京 ノベルティ 制作会社" className={`${inputClass} py-3`} /><span className="text-xs font-normal text-[var(--muted)]">配置 Brave Search Key 后会自动搜索；未配置时请填写下方来源网址。</span></label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">公开企业目录或名单网址（每行一个）<textarea name="sourceUrls" rows={4} placeholder="https://example.jp/member-list" className={`${inputClass} py-3`} /></label>
      <label className="grid gap-2 text-sm font-medium">地区<select name="region" className={inputClass}><option>全国</option><option>关东</option><option>关西</option><option>东京</option><option>大阪</option></select></label>
      <label className="grid gap-2 text-sm font-medium">每次成功目标<input required name="targetSuccessCount" type="number" min="1" max="100" defaultValue="20" className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-medium">最多发现企业数<input required name="maxLeads" type="number" min="1" max="100" defaultValue="20" className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">日文核心文案<textarea required name="coreMessageJa" rows={5} className={`${inputClass} py-3`} /></label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">日文 CTA<textarea required name="ctaJa" rows={3} className={`${inputClass} py-3`} /></label>
      <label className="grid gap-2 text-sm font-medium">计划时间（JST）<input name="scheduleTimeJst" type="time" defaultValue="09:30" className={inputClass} /></label>
    </div>
    <p role="alert" aria-live="polite" className="mt-5 min-h-5 text-sm text-[var(--danger)]">{error}</p>
    <button disabled={pending} className="mt-6 min-h-11 rounded-xl bg-[var(--foreground)] px-5 text-sm font-semibold text-[var(--background)] transition-transform duration-150 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">{pending ? "创建中" : "创建 Campaign"}</button>
  </form>;
}
