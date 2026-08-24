import Link from "next/link";
import {
  ChartPieSlice, Cube, FlagBanner, Gear, ListChecks, SignOut, Wallet
} from "@phosphor-icons/react/dist/ssr";
import { Brand } from "./brand";
import { cn } from "@/lib/cn";

const navigation = [
  { href: "/dashboard", label: "概览", icon: ChartPieSlice },
  { href: "/dashboard/products", label: "产品", icon: Cube },
  { href: "/dashboard/campaigns", label: "Campaign", icon: FlagBanner },
  { href: "/dashboard/outreach", label: "外联记录", icon: ListChecks },
  { href: "/dashboard/credits", label: "Credits", icon: Wallet },
  { href: "/dashboard/settings", label: "设置", icon: Gear }
];

export function AppShell({ active, title, description, children }: {
  active: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="hidden border-r border-[var(--line)] bg-[var(--surface)] p-5 md:flex md:flex-col">
        <Brand href="/dashboard" />
        <nav aria-label="控制台导航" className="mt-10 space-y-1">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]",
              active === href && "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
            )}>
              <Icon className="size-5" weight={active === href ? "fill" : "regular"} />{label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-[var(--line)] pt-5">
          <p className="truncate text-sm font-medium">青岛海川制造</p>
          <p className="mt-1 truncate text-xs text-[var(--muted)]">founder@example.cn</p>
          <Link href="/" className="mt-4 flex min-h-10 items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            <SignOut className="size-4" />返回网站
          </Link>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3 md:hidden">
          <Brand href="/dashboard" />
          <nav aria-label="移动端控制台导航" className="mt-3 flex gap-1 overflow-x-auto pb-1">
            {navigation.slice(0, 5).map(({ href, label }) => (
              <Link key={href} href={href} className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-[var(--muted)]",
                active === href && "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
              )}>{label}</Link>
            ))}
          </nav>
        </div>
        <main className="mx-auto max-w-[92rem] px-4 py-7 sm:px-6 lg:px-10 lg:py-9">
          <header>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-balance text-2xl font-semibold md:text-3xl">{title}</h1>
              <span className="rounded-lg bg-[var(--surface-strong)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">演示数据</span>
            </div>
            <p className="mt-2 max-w-2xl text-pretty text-sm leading-6 text-[var(--muted)]">{description}</p>
          </header>
          <div className="mt-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
