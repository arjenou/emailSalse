import { AppShell } from "@/components/app-shell";

export default function SettingsPage() {
  return <AppShell active="/dashboard/settings" title="设置" description="Workspace 信息由所有 Campaign 共用。修改会结束正在执行的 Run。">
    <form className="max-w-2xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6" aria-label="Workspace 设置">
      <div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">公司名称<input defaultValue="青岛海川制造有限公司" className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--background)] px-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]" /></label><label className="grid gap-2 text-sm font-medium">公司网站<input type="url" defaultValue="https://example.cn" className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--background)] px-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]" /></label><label className="grid gap-2 text-sm font-medium">联系人<input defaultValue="王云杰" className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--background)] px-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]" /></label><label className="grid gap-2 text-sm font-medium">联系邮箱<input type="email" defaultValue="founder@example.cn" className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--background)] px-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]" /></label></div>
      <p className="mt-5 text-pretty text-xs leading-5 text-[var(--muted)]">保存后，所有 Running Campaign 会结束当前 Run，并以最新资料创建新 Run。</p>
      <button type="submit" className="mt-5 min-h-11 rounded-xl bg-[var(--foreground)] px-5 text-sm font-semibold text-[var(--background)] transition-transform duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">保存 Workspace</button>
    </form>
  </AppShell>;
}
