import { Plus } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/app-shell";
import { ButtonLink } from "@/components/button-link";
import { StatusBadge } from "@/components/status-badge";

export default function ProductsPage() {
  return <AppShell active="/dashboard/products" title="产品" description="只有用户确认后的信息会被用于企业匹配和日文外联。MVP 支持文字与产品页面链接。">
    <div className="flex justify-end"><ButtonLink href="/dashboard/products/new"><Plus className="mr-2 size-4" weight="bold" />新增产品</ButtonLink></div>
    <article className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">帆布袋与礼赠品</h2><p className="mt-2 text-sm text-[var(--muted)]">OEM/ODM / 300 件起 / 25-35 天</p></div><StatusBadge tone="success">已确认</StatusBadge></div>
      <p className="mt-6 max-w-3xl text-pretty text-sm leading-7 text-[var(--muted)]">支持定制帆布袋、收纳包和活动礼赠品。可做 OEM/ODM，支持小批量，并有日本出口经验。</p>
      <div className="mt-6 flex gap-4 text-sm"><a href="https://example.cn/products" className="font-medium text-[var(--accent-strong)]">产品页面</a><span className="text-[var(--muted)]">被 1 个 Campaign 使用</span></div>
    </article>
  </AppShell>;
}
