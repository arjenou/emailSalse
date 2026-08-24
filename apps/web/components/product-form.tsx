"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
const inputClass = "min-h-11 rounded-xl border border-[var(--line)] bg-[var(--background)] px-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

export function ProductForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${apiUrl}/v1/products`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data))
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "保存失败");
      router.push("/dashboard/products");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败");
    } finally { setPending(false); }
  }

  return <form onSubmit={submit} className="max-w-3xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">产品或服务名称<input required name="name" className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">产品说明<textarea required name="description" rows={5} className={`${inputClass} py-3`} /><span className="text-xs font-normal text-[var(--muted)]">请只填写可以确认的事实，不要包含未经验证的客户、认证或产能信息。</span></label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">核心优势<textarea name="advantages" rows={3} className={`${inputClass} py-3`} /></label>
      <label className="grid gap-2 text-sm font-medium">服务类型<input name="serviceType" placeholder="例如 OEM/ODM" className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-medium">产品页面 URL<input name="productUrl" type="url" className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-medium">MOQ<input name="moq" className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-medium">交期<input name="leadTime" className={inputClass} /></label>
    </div>
    {error && <p role="alert" className="mt-5 text-sm text-[var(--danger)]">{error}</p>}
    <button disabled={pending} className="mt-6 min-h-11 rounded-xl bg-[var(--foreground)] px-5 text-sm font-semibold text-[var(--background)] transition-transform duration-150 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">{pending ? "保存中" : "确认并保存"}</button>
  </form>;
}
