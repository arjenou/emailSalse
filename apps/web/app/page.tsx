import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, GlobeHemisphereEast, ShieldCheck, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { Brand } from "@/components/brand";
import { ButtonLink } from "@/components/button-link";

const capabilities = [
  { icon: GlobeHemisphereEast, title: "发现真实企业", text: "分析日本企业官网与业务证据，不依赖简单行业标签。" },
  { icon: Sparkle, title: "生成日文联系", text: "基于确认过的产品事实，生成克制、准确的个性化开头。" },
  { icon: ShieldCheck, title: "先检查再提交", text: "遇到禁止营业联系、CAPTCHA 或不确定结果时自动跳过。" }
];

export default function Home() {
  return (
    <main>
      <header className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Brand />
        <nav aria-label="主导航" className="hidden items-center gap-7 text-sm text-[var(--muted)] md:flex">
          <Link href="#workflow" className="hover:text-[var(--foreground)]">工作方式</Link>
          <Link href="#principles" className="hover:text-[var(--foreground)]">执行原则</Link>
          <ButtonLink href="/dashboard" className="min-h-10 px-4">打开控制台</ButtonLink>
        </nav>
        <ButtonLink href="/dashboard" className="min-h-10 px-4 md:hidden">控制台</ButtonLink>
      </header>

      <section className="mx-auto grid min-h-[calc(100dvh-4.5rem)] max-w-7xl items-center gap-10 px-5 py-10 md:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="max-w-xl">
          <p className="mb-5 text-sm font-semibold text-[var(--accent)]">日本市场 B2B 自动开发</p>
          <h1 className="text-balance text-4xl font-semibold leading-[1.08] md:text-5xl lg:text-6xl">
            把产品资料变成真实的日本商机
          </h1>
          <p className="mt-6 max-w-[34rem] text-pretty text-lg leading-8 text-[var(--muted)]">
            Kylon 自动发现企业、验证匹配，并完成合规的日文官网联系。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/dashboard">进入控制台 <ArrowRight className="ml-2 size-4" weight="bold" /></ButtonLink>
            <ButtonLink href="#workflow" variant="secondary">查看工作方式</ButtonLink>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-lg shadow-emerald-950/10">
          <Image
            src="/kylon-hero.jpg"
            alt="外贸企业负责人查看产品材料并研究日本市场"
            width={1536}
            height={1024}
            priority
            className="aspect-[3/2] w-full object-cover"
          />
        </div>
      </section>

      <section id="workflow" className="border-y border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <h2 className="max-w-2xl text-balance text-3xl font-semibold md:text-4xl">从资料确认到成功记录</h2>
          <p className="mt-4 max-w-2xl text-pretty leading-7 text-[var(--muted)]">用户设定方向和数量，系统负责执行。每次成功都有证据、状态和完整审计记录。</p>
          <div className="mt-12 grid gap-6 md:grid-cols-[1.25fr_0.75fr]">
            <ol className="rounded-2xl border border-[var(--line)] bg-[var(--background)] p-6 md:p-8">
              {["确认公司与产品事实", "创建 Campaign 和日文核心文案", "发现并评分日本企业", "检查官网规则与联系表单", "确认成功后扣除 1 Credit"].map((item, index) => (
                <li key={item} className="flex gap-5 py-4 first:pt-0 last:pb-0">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] font-mono text-sm font-semibold tabular-nums text-[var(--accent)]">{index + 1}</span>
                  <span className="self-center font-medium">{item}</span>
                </li>
              ))}
            </ol>
            <div id="principles" className="rounded-2xl bg-[var(--foreground)] p-7 text-[var(--background)] md:p-8">
              <h3 className="text-balance text-2xl font-semibold">只为确定的成功付费</h3>
              <ul className="mt-8 space-y-5 text-sm leading-6 opacity-90">
                {["Lead Score 固定不低于 80", "CAPTCHA 和禁止营业联系自动跳过", "失败和跳过永久进入 Workspace 抑制名单", "重复执行不会重复扣除 Credits"].map((item) => (
                  <li key={item} className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-[var(--accent)]" weight="bold" />{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <h2 className="text-balance text-3xl font-semibold md:text-4xl">自动执行，边界清晰</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {capabilities.map(({ icon: Icon, title, text }) => (
            <article key={title} className="border-l border-[var(--line)] pl-5">
              <Icon className="size-7 text-[var(--accent)]" weight="duotone" />
              <h3 className="mt-6 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-pretty text-sm leading-6 text-[var(--muted)]">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <Brand />
          <p>为中国企业建立可审计的日本市场开发流程。</p>
        </div>
      </footer>
    </main>
  );
}
