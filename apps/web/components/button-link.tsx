import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function ButtonLink({ className, variant = "primary", ...props }: ComponentProps<typeof Link> & { variant?: "primary" | "secondary" }) {
  return (
    <Link
      className={cn(
        "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl px-5 text-sm font-semibold transition-[transform,background-color] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
        variant === "primary"
          ? "bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--accent-strong)]"
          : "border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-strong)]",
        className
      )}
      {...props}
    />
  );
}
