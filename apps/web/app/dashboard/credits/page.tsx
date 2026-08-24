import { AppShell } from "@/components/app-shell";

export default function CreditsPage() {
  return <AppShell active="/dashboard/credits" title="Credits" description="成功提交后才扣除 1 Credit。消耗顺序为 Trial、Subscription、Top-up。">
    <section className="grid gap-5 md:grid-cols-2"><article className="rounded-2xl bg-[var(--foreground)] p-7 text-[var(--background)]"><p className="text-sm opacity-70">可用总额</p><p className="mt-4 font-mono text-5xl font-semibold tabular-nums">25</p><p className="mt-5 text-sm opacity-75">Trial 3 / Subscription 22 / Top-up 0</p></article><article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-7"><h2 className="font-semibold">额度规则</h2><p className="mt-4 text-pretty text-sm leading-7 text-[var(--muted)]">订阅额度按周期清零，Top-up 永久有效。失败、跳过、CAPTCHA 和不确定结果不扣费。</p></article></section>
  </AppShell>;
}
