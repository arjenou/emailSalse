"use client";

import { useState } from "react";
import { Pause, Play } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

export function CampaignActions({ campaignId, initialStatus }: { campaignId: string; initialStatus: "RUNNING" | "PAUSED" }) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function update(action: "start" | "pause") {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/kylon/v1/campaigns/${campaignId}/${action}`, { method: "POST" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "操作失败");
      setStatus(action === "start" ? "RUNNING" : "PAUSED");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "操作失败");
    } finally {
      setPending(false);
    }
  }

  const isRunning = status === "RUNNING";
  return (
      <div aria-live="polite">
      <button
        type="button"
        disabled={pending}
        onClick={() => update(isRunning ? "pause" : "start")}
        className={cn(
          "inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-transform duration-150 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
          isRunning ? "border border-[var(--line)] bg-[var(--surface)]" : "bg-[var(--foreground)] text-[var(--background)]"
        )}
      >
        {isRunning ? <Pause className="size-4" weight="fill" /> : <Play className="size-4" weight="fill" />}
        {pending ? "处理中" : isRunning ? "暂停" : "立即开始"}
      </button>
      {error && <p role="alert" className="mt-2 max-w-48 text-pretty text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}
