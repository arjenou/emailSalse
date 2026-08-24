import { Plus } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/app-shell";
import { ButtonLink } from "@/components/button-link";
import { CampaignActions } from "@/components/campaign-actions";
import { StatusBadge } from "@/components/status-badge";
import { apiGet } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type Campaign = { id: string; name: string; campaign_context: string | null; region: string; status: "RUNNING" | "PAUSED"; target_success_count: number; max_leads: number; success_count: number | null; lead_count: number; active_job_count: number; config_version: number };

export default async function CampaignsPage() {
  const { campaigns } = await apiGet<{ campaigns: Campaign[] }>("/v1/campaigns");
  return <AppShell active="/dashboard/campaigns" title="Campaign" description="启动后会发现、评估并准备联系目标；自动化默认停在提交前。">
    <div className="flex justify-end"><ButtonLink href="/dashboard/campaigns/new"><Plus className="mr-2 size-4" weight="bold" />创建 Campaign</ButtonLink></div>
    <div className="mt-5 grid gap-4">
      {campaigns.map((campaign) => <article key={campaign.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
        <div className="grid gap-6 md:grid-cols-[1fr_auto]">
          <div><div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-semibold">{campaign.name}</h2><StatusBadge tone={campaign.status === "RUNNING" ? "success" : "neutral"}>{campaign.status === "RUNNING" ? "运行中" : "已暂停"}</StatusBadge></div><p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-[var(--muted)]">{campaign.campaign_context || `${campaign.region}地区的企业发现与外联任务`}</p></div>
          <CampaignActions campaignId={campaign.id} initialStatus={campaign.status} />
        </div>
        <dl className="mt-7 grid gap-5 border-t border-[var(--line)] pt-6 sm:grid-cols-5"><div><dt className="text-xs text-[var(--muted)]">成功目标</dt><dd className="mt-1 font-mono font-semibold tabular-nums">{campaign.target_success_count}</dd></div><div><dt className="text-xs text-[var(--muted)]">最多发现</dt><dd className="mt-1 font-mono font-semibold tabular-nums">{campaign.max_leads}</dd></div><div><dt className="text-xs text-[var(--muted)]">已发现</dt><dd className="mt-1 font-mono font-semibold tabular-nums">{campaign.lead_count}</dd></div><div><dt className="text-xs text-[var(--muted)]">待处理</dt><dd className="mt-1 font-mono font-semibold tabular-nums">{campaign.active_job_count}</dd></div><div><dt className="text-xs text-[var(--muted)]">已成功</dt><dd className="mt-1 font-mono font-semibold tabular-nums">{campaign.success_count ?? 0}</dd></div></dl>
      </article>)}
      {campaigns.length === 0 && <div className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">还没有 Campaign。创建后可手动启动。</div>}
    </div>
  </AppShell>;
}
