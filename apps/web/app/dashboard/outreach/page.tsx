import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { apiGet } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type Outreach = { id: string; status: "PENDING" | "SUCCESS" | "FAILED" | "SKIPPED"; reason: string | null; company_name: string; website_url: string; lead_score: number; qualification_reason: string | null; evidence_count: number; processed_at: number | null };
const labels = { PENDING: "待确认", SUCCESS: "成功", FAILED: "失败", SKIPPED: "跳过" } as const;

export default async function OutreachPage() {
  const { outreach } = await apiGet<{ outreach: Outreach[] }>("/v1/outreach");
  return <AppShell active="/dashboard/outreach" title="外联记录" description="DRY_RUN 时会保存填写前截图并显示“待确认”，不会点击提交。">
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]"><div className="overflow-x-auto"><table className="w-full min-w-[56rem] text-left text-sm"><thead className="bg-[var(--surface-strong)] text-xs text-[var(--muted)]"><tr>{["企业", "Lead Score", "结果", "判断或原因", "证据"].map((head) => <th key={head} className="px-5 py-3 font-medium">{head}</th>)}</tr></thead><tbody>{outreach.map((row) => <tr key={row.id} className="border-t border-[var(--line)]"><td className="px-5 py-4"><p className="font-medium">{row.company_name}</p><a href={row.website_url} target="_blank" rel="noreferrer" className="mt-1 block max-w-72 truncate text-xs text-[var(--accent-strong)]">{row.website_url}</a></td><td className="px-5 py-4 font-mono tabular-nums">{row.lead_score}</td><td className="px-5 py-4"><StatusBadge tone={row.status === "SUCCESS" ? "success" : row.status === "FAILED" ? "danger" : "neutral"}>{labels[row.status]}</StatusBadge></td><td className="max-w-md px-5 py-4 text-pretty text-[var(--muted)]">{row.reason || row.qualification_reason || "处理中"}</td><td className="px-5 py-4 font-mono tabular-nums">{row.evidence_count}</td></tr>)}</tbody></table>{outreach.length === 0 && <p className="p-8 text-center text-sm text-[var(--muted)]">还没有处理记录。</p>}</div></div>
  </AppShell>;
}
