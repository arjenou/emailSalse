import { Plus } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/app-shell";
import { ButtonLink } from "@/components/button-link";
import { CampaignActions } from "@/components/campaign-actions";
import { StatusBadge } from "@/components/status-badge";

export default function CampaignsPage() {
  return <AppShell active="/dashboard/campaigns" title="Campaign" description="每次启动都会创建独立 Run。修改配置会结束当前 Run，并使用新版本重新开始。">
    <div className="flex justify-end"><ButtonLink href="/dashboard/campaigns/new"><Plus className="mr-2 size-4" weight="bold" />创建 Campaign</ButtonLink></div>
    <article className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <div><div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-semibold">日本品牌联名与礼赠品</h2><StatusBadge tone="success">运行中</StatusBadge></div><p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-[var(--muted)]">寻找有联名企划、OEM 或促销品需求的日本企业。区域为关东，Lead Score 阈值固定为 80。</p></div>
        <CampaignActions campaignId="cmp_demo" initialStatus="RUNNING" />
      </div>
      <dl className="mt-7 grid gap-5 border-t border-[var(--line)] pt-6 sm:grid-cols-4"><div><dt className="text-xs text-[var(--muted)]">Run 目标</dt><dd className="mt-1 font-mono font-semibold tabular-nums">20</dd></div><div><dt className="text-xs text-[var(--muted)]">计划</dt><dd className="mt-1 font-medium">一 / 三 / 五</dd></div><div><dt className="text-xs text-[var(--muted)]">时间</dt><dd className="mt-1 font-mono font-semibold tabular-nums">09:30 JST</dd></div><div><dt className="text-xs text-[var(--muted)]">配置版本</dt><dd className="mt-1 font-mono font-semibold tabular-nums">1</dd></div></dl>
    </article>
  </AppShell>;
}
