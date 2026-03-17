"use client";

import { useState } from "react";
import type { ProjectInfo } from "@/lib/scanner";
import { Server, Wrench, Bot, ChevronRight, ArrowRight, Play, Loader2 } from "lucide-react";

interface Props {
  project: ProjectInfo;
  onClick: () => void;
}

function StatusBar({ percent }: { percent: number }) {
  const color =
    percent >= 70 ? "bg-emerald-500" :
    percent >= 35 ? "bg-amber-500" :
    "bg-rose-500";
  const labelColor =
    percent >= 70 ? "text-emerald-400" :
    percent >= 35 ? "text-amber-400" :
    "text-rose-400";

  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.max(percent, 3)}%` }}
        />
      </div>
      <span className={`shrink-0 font-mono text-[10px] font-semibold tabular-nums ${labelColor}`}>
        {percent}%
      </span>
    </div>
  );
}

export function ProjectCard({ project, onClick }: Props) {
  const { status } = project;
  const [starting, setStarting] = useState(false);

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setStarting(true);
    try {
      const res = await fetch("/api/start-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName: project.name }),
      });
      const data = await res.json() as { ok: boolean; url?: string };
      if (data.ok && data.url) window.open(data.url, "_blank");
    } catch { /* ignore */ } finally {
      setStarting(false);
    }
  };

  const hasMeta = project.mcpServers.length > 0 || project.skills.length > 0 || project.agents.length > 0;

  return (
    <div
      onClick={onClick}
      className="card card-interactive group flex flex-col p-5"
    >
      {/* ── Header row ─────────────────────────────────────────── */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[var(--foreground)] group-hover:text-white transition-colors">
            {project.name}
          </h3>
          {project.techStack.length > 0 && (
            <p className="mt-0.5 font-mono text-[10px] text-[var(--muted-2)]">
              {project.techStack.slice(0, 3).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={handleStart}
            disabled={starting}
            title="Start dev server"
            className="flex items-center gap-1 rounded-md border border-[var(--border-2)] bg-[var(--surface-2)] px-2 py-1 text-[10px] font-medium text-[var(--muted)] transition-all hover:border-emerald-600/60 hover:bg-emerald-600/10 hover:text-emerald-400 disabled:opacity-40"
          >
            {starting
              ? <Loader2 size={9} className="animate-spin" />
              : <Play size={9} />
            }
            Start
          </button>
          <ChevronRight
            size={14}
            className="text-[var(--muted-2)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--muted)]"
          />
        </div>
      </div>

      {/* ── Summary ────────────────────────────────────────────── */}
      <p className="mb-4 text-[11px] leading-relaxed text-[var(--muted)] line-clamp-2 flex-shrink-0">
        {project.summary || "No summary available"}
      </p>

      {/* ── Progress ───────────────────────────────────────────── */}
      <div className="mb-3">
        <StatusBar percent={status.percent} />
      </div>

      {/* ── Next step ──────────────────────────────────────────── */}
      {status.nextSteps.length > 0 && (
        <p className="mb-3 flex items-start gap-1.5 text-[11px] text-[var(--muted-2)] line-clamp-1">
          <ArrowRight size={9} className="mt-0.5 shrink-0 text-[var(--muted-2)]" />
          <span className="truncate">{status.nextSteps[0]}</span>
          {status.nextSteps.length > 1 && (
            <span className="ml-auto shrink-0 font-mono text-[10px]">+{status.nextSteps.length - 1}</span>
          )}
        </p>
      )}

      {/* ── Footer: augmentation counts ────────────────────────── */}
      <div className="mt-auto flex items-center gap-3 border-t border-[var(--border)] pt-3 text-[11px]">
        {project.mcpServers.length > 0 && (
          <span className="flex items-center gap-1 text-emerald-500">
            <Server size={10} />
            {project.mcpServers.length}
          </span>
        )}
        {project.skills.length > 0 && (
          <span className="flex items-center gap-1 text-blue-400">
            <Wrench size={10} />
            {project.skills.length}
          </span>
        )}
        {project.agents.length > 0 && (
          <span className="flex items-center gap-1 text-rose-400">
            <Bot size={10} />
            {project.agents.length}
          </span>
        )}
        {!hasMeta && (
          <span className="font-mono text-[10px] text-[var(--muted-2)] italic">no augmentations</span>
        )}

        {/* MCP tag pills */}
        {project.mcpServers.length > 0 && (
          <div className="ml-auto flex gap-1 overflow-hidden">
            {project.mcpServers.slice(0, 3).map((mcp) => (
              <span
                key={mcp.name}
                className="rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2 py-0.5 font-mono text-[9px] text-emerald-400"
              >
                {mcp.name}
              </span>
            ))}
            {project.mcpServers.length > 3 && (
              <span className="font-mono text-[9px] text-[var(--muted-2)]">
                +{project.mcpServers.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
