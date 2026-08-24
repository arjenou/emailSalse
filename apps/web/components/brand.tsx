import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 font-semibold text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]">
      <span aria-hidden="true" className="grid size-8 place-items-center rounded-xl bg-[var(--foreground)] text-sm font-bold text-[var(--background)]">K</span>
      <span>Kylon</span>
    </Link>
  );
}
