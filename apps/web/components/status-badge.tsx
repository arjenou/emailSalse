import { cn } from "@/lib/cn";

const styles = {
  success: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  neutral: "bg-[var(--surface-strong)] text-[var(--muted)]",
  danger: "bg-red-50 text-[var(--danger)] dark:bg-red-950/40"
};

export function StatusBadge({ tone = "neutral", children }: { tone?: keyof typeof styles; children: React.ReactNode }) {
  return <span className={cn("inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold", styles[tone])}>{children}</span>;
}
