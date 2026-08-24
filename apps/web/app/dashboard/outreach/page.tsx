import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";

const rows = [
  ["株式会社クラシコム", "https://kurashicom.jp", "91", "成功", "官网业务与生活杂货、原创商品高度相关", "-1"],
  ["中川政七商店", "https://www.nakagawa-masashichi.jp", "86", "跳过", "联系页面明确禁止营业联系", "0"],
  ["株式会社ロフト", "https://www.loft.co.jp", "88", "失败", "提交结果无法确认", "0"]
];

export default function OutreachPage() {
  return <AppShell active="/dashboard/outreach" title="外联记录" description="展示所有成功、失败和跳过结果。历史记录保留当时的发送人快照和 Campaign 配置版本。">
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]"><div className="overflow-x-auto"><table className="w-full min-w-[58rem] text-left text-sm"><thead className="bg-[var(--surface-strong)] text-xs text-[var(--muted)]"><tr>{["企业", "Lead Score", "结果", "判断或原因", "Credits"].map((head) => <th key={head} className="px-5 py-3 font-medium">{head}</th>)}</tr></thead><tbody>{rows.map(([company, website, score, status, reason, credit]) => <tr key={company} className="border-t border-[var(--line)]"><td className="px-5 py-4"><p className="font-medium">{company}</p><a href={website} className="mt-1 block text-xs text-[var(--accent-strong)]">{website}</a></td><td className="px-5 py-4 font-mono tabular-nums">{score}</td><td className="px-5 py-4"><StatusBadge tone={status === "成功" ? "success" : status === "失败" ? "danger" : "neutral"}>{status}</StatusBadge></td><td className="max-w-md px-5 py-4 text-pretty text-[var(--muted)]">{reason}</td><td className="px-5 py-4 font-mono tabular-nums">{credit}</td></tr>)}</tbody></table></div></div>
  </AppShell>;
}
