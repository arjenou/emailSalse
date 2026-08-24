import Link from "next/link";
import { ArrowRight, Buildings, CheckCircle, ClockCounterClockwise, ListChecks } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/app-shell";
import { apiGet } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type Count = { status: string; count: number };
function count(rows: Count[], ...statuses: string[]) { return rows.filter((row) => statuses.includes(row.status)).reduce((sum, row) => sum + Number(row.count), 0); }

export default async function Dashboard() {
  const data = await apiGet<{ campaigns: Count[]; outreach: Count[]; leads: Count[]; jobs: Count[] }>("/v1/dashboard");
  const metrics = [
    { label: "运行中 Campaign", value: count(data.campaigns, "RUNNING"), note: "可随时暂停", icon: ClockCounterClockwise },
    { label: "已发现企业", value: data.leads.reduce((sum, row) => sum + Number(row.count), 0), note: "包含所有判断结果", icon: Buildings },
    { label: "待处理任务", value: count(data.jobs, "PENDING", "RUNNING"), note: "需保持本地 Worker 运行", icon: ListChecks },
    { label: "已确认成功", value: count(data.outreach, "SUCCESS"), note: "仅统计可验证提交", icon: CheckCircle }
  ];
  return <AppShell active="/dashboard" title="概览" description="查看真实的发现、评估和联系任务状态。所有外联默认采用安全预览模式。">
    <section aria-label="关键指标" className="grid gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ label, value, note, icon: Icon }) => <article key={label} className="bg-[var(--surface)] p-5 lg:p-6"><div className="flex items-center justify-between text-[var(--muted)]"><p className="text-sm">{label}</p><Icon className="size-5" /></div><p className="mt-4 font-mono text-3xl font-semibold tabular-nums">{value}</p><p className="mt-2 text-xs text-[var(--muted)]">{note}</p></article>)}
    </section>
    <section className="mt-7 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
      <h2 className="font-semibold">开始使用</h2>
      <ol className="mt-4 grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-3"><li>1. 在设置中填写发送方资料</li><li>2. 新增产品和 Campaign</li><li>3. 启动本地 Worker 后开始 Campaign</li></ol>
      <div className="mt-6 flex flex-wrap gap-5"><Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">填写设置 <ArrowRight className="size-4" /></Link><Link href="/dashboard/campaigns" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">管理 Campaign <ArrowRight className="size-4" /></Link></div>
    </section>
  </AppShell>;
}
