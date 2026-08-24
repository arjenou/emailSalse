import Link from "next/link";
import { ArrowRight, Buildings, CheckCircle, ClockCounterClockwise, Wallet } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/app-shell";
import { CampaignActions } from "@/components/campaign-actions";
import { StatusBadge } from "@/components/status-badge";

const recent = [
  { company: "株式会社クラシコム", campaign: "日本品牌联名与礼赠品", status: "成功", score: 91, time: "今天 10:42" },
  { company: "中川政七商店", campaign: "日本品牌联名与礼赠品", status: "跳过", score: 86, time: "今天 10:18" },
  { company: "株式会社ロフト", campaign: "日本品牌联名与礼赠品", status: "失败", score: 88, time: "今天 09:56" }
];

export default function Dashboard() {
  return (
    <AppShell active="/dashboard" title="概览" description="查看 Campaign 执行、成功联系和 Credits 消耗。所有时间均为日本时间。">
      <section aria-label="关键指标" className="grid gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "可用 Credits", value: "25", note: "Trial 3 + 订阅 22", icon: Wallet },
          { label: "运行中 Campaign", value: "1", note: "目标 20 次成功", icon: ClockCounterClockwise },
          { label: "本月成功", value: "17", note: "均已确认提交", icon: CheckCircle },
          { label: "已处理企业", value: "46", note: "包含失败与跳过", icon: Buildings }
        ].map(({ label, value, note, icon: Icon }) => (
          <article key={label} className="bg-[var(--surface)] p-5 lg:p-6">
            <div className="flex items-center justify-between text-[var(--muted)]"><p className="text-sm">{label}</p><Icon className="size-5" /></div>
            <p className="mt-4 font-mono text-3xl font-semibold tabular-nums">{value}</p>
            <p className="mt-2 text-xs text-[var(--muted)]">{note}</p>
          </article>
        ))}
      </section>

      <div className="mt-7 grid gap-7 xl:grid-cols-[1.45fr_0.55fr]">
        <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] p-5">
            <div><h2 className="font-semibold">正在执行</h2><p className="mt-1 text-xs text-[var(--muted)]">同一 Campaign 同时只有一个 Active Run</p></div>
            <StatusBadge tone="success">运行中</StatusBadge>
          </div>
          <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h3 className="font-semibold">日本品牌联名与礼赠品</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">关东 / 周一、周三、周五 09:30</p>
              <dl className="mt-6 grid grid-cols-3 gap-4">
                <div><dt className="text-xs text-[var(--muted)]">本次目标</dt><dd className="mt-1 font-mono text-xl font-semibold tabular-nums">20</dd></div>
                <div><dt className="text-xs text-[var(--muted)]">已成功</dt><dd className="mt-1 font-mono text-xl font-semibold tabular-nums">7</dd></div>
                <div><dt className="text-xs text-[var(--muted)]">已检查</dt><dd className="mt-1 font-mono text-xl font-semibold tabular-nums">19</dd></div>
              </dl>
            </div>
            <CampaignActions campaignId="cmp_demo" initialStatus="RUNNING" />
          </div>
        </section>

        <aside className="rounded-2xl bg-[var(--foreground)] p-6 text-[var(--background)]">
          <p className="text-sm opacity-70">下一次计划</p>
          <p className="mt-3 font-mono text-2xl font-semibold tabular-nums">周三 09:30</p>
          <p className="mt-3 text-pretty text-sm leading-6 opacity-75">若当前 Run 届时仍在执行，本次计划会跳过，不会排队补跑。</p>
          <Link href="/dashboard/campaigns" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">管理 Campaign <ArrowRight className="size-4" /></Link>
        </aside>
      </div>

      <section className="mt-7 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
        <div className="flex items-center justify-between p-5">
          <h2 className="font-semibold">最近处理</h2>
          <Link href="/dashboard/outreach" className="text-sm font-medium text-[var(--accent-strong)]">查看全部</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="bg-[var(--surface-strong)] text-xs text-[var(--muted)]"><tr><th className="px-5 py-3 font-medium">企业</th><th className="px-5 py-3 font-medium">Campaign</th><th className="px-5 py-3 font-medium">Lead Score</th><th className="px-5 py-3 font-medium">结果</th><th className="px-5 py-3 font-medium">处理时间</th></tr></thead>
            <tbody>{recent.map((row) => <tr key={row.company} className="border-t border-[var(--line)]"><td className="px-5 py-4 font-medium">{row.company}</td><td className="px-5 py-4 text-[var(--muted)]">{row.campaign}</td><td className="px-5 py-4 font-mono tabular-nums">{row.score}</td><td className="px-5 py-4"><StatusBadge tone={row.status === "成功" ? "success" : row.status === "失败" ? "danger" : "neutral"}>{row.status}</StatusBadge></td><td className="px-5 py-4 text-[var(--muted)]">{row.time}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
