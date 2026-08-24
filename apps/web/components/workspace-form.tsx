"use client";

import { FormEvent, useState } from "react";

type Workspace = Record<string, string | null> | null;
const inputClass = "min-h-11 rounded-xl border border-[var(--line)] bg-[var(--background)] px-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

export function WorkspaceForm({ workspace }: { workspace: Workspace }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/kylon/v1/workspace", {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data))
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "保存失败");
      setMessage("已保存");
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存失败"); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="max-w-3xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6" aria-label="Workspace 设置">
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium">公司名称<input required name="companyName" defaultValue={workspace?.company_name ?? ""} className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-medium">公司日文名<input name="companyNameJa" defaultValue={workspace?.company_name_ja ?? ""} className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">公司网站<input required name="websiteUrl" type="url" defaultValue={workspace?.website_url ?? ""} className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">公司介绍<textarea name="companyDescription" rows={4} defaultValue={workspace?.company_description ?? ""} className={`${inputClass} py-3`} /></label>
      <label className="grid gap-2 text-sm font-medium">联系人<input required name="contactName" defaultValue={workspace?.contact_name ?? ""} className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-medium">联系人片假名<input name="contactNameKana" defaultValue={workspace?.contact_name_kana ?? ""} className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-medium">联系邮箱<input required name="email" type="email" defaultValue={workspace?.email ?? ""} className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-medium">联系电话<input name="phone" defaultValue={workspace?.phone ?? ""} className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-medium">部门<input name="department" defaultValue={workspace?.department ?? ""} className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-medium">职位<input name="jobTitle" defaultValue={workspace?.job_title ?? ""} className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">地址<input name="address" defaultValue={workspace?.address ?? ""} className={inputClass} /></label>
    </div>
    <p aria-live="polite" className="mt-5 min-h-5 text-sm text-[var(--muted)]">{message}</p>
    <button type="submit" disabled={pending} className="mt-3 min-h-11 rounded-xl bg-[var(--foreground)] px-5 text-sm font-semibold text-[var(--background)] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">{pending ? "保存中" : "保存 Workspace"}</button>
  </form>;
}
