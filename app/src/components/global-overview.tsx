"use client";

import type { ScanResult } from "@/lib/scanner";
import { Server, Plug, Bot, Wrench, Cpu, Terminal } from "lucide-react";

interface Props {
  data: ScanResult;
  onMutate: (body: Record<string, unknown>) => Promise<unknown>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accentClass,
  iconBgClass,
}: {
  icon: typeof Cpu;
  label: string;
  value: string | number;
  sub?: string;
  accentClass: string;   // left bar color
  iconBgClass: string;   // icon bg + text color
}) {
  return (
    <div className={`card relative overflow-hidden p-5 transition-all hover:translate-y-[-1px] hover:shadow-xl`}>
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 h-full w-[3px] rounded-l-[inherit] ${accentClass}`} />

      <div className="flex items-start justify-between">
        <div className="flex-1 pl-1">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-2)]">
            {label}
          </p>
          <p className="font-mono text-3xl font-bold leading-none text-[var(--foreground)] tabular-nums">
            {value}
          </p>
          {sub && (
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)] line-clamp-2">
              {sub}
            </p>
          )}
        </div>
        <div className={`ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBgClass}`}>
          <Icon size={15} />
        </div>
      </div>
    </div>
  );
}

export function GlobalOverview({ data }: Props) {
  const { global, projects, allMCPs, allCommands } = data;
  const uniqueMcps = new Set(allMCPs.map(m => m.name)).size;
  const projectMcps = allMCPs.filter(m => m.source !== "oauth" && m.project !== "global").length;

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-2)]">
        Overview
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={Cpu}
          label="Model"
          value={global.model.replace("claude-", "").replace(/-\d{8}$/, "")}
          sub={global.model}
          accentClass="bg-amber-500"
          iconBgClass="bg-amber-500/15 text-amber-400"
        />
        <StatCard
          icon={Server}
          label="MCP Servers"
          value={uniqueMcps}
          sub={`${projectMcps} connections · ${projects.length} projects`}
          accentClass="bg-emerald-500"
          iconBgClass="bg-emerald-500/15 text-emerald-400"
        />
        <StatCard
          icon={Plug}
          label="Plugins"
          value={global.plugins.length}
          sub={global.plugins.map(p => p.shortName).join(", ") || "none installed"}
          accentClass="bg-violet-500"
          iconBgClass="bg-violet-500/15 text-violet-400"
        />
        <StatCard
          icon={Wrench}
          label="Skills"
          value={data.allSkills.length}
          sub={`${global.skills.length} global · ${data.allSkills.length - global.skills.length} project`}
          accentClass="bg-blue-500"
          iconBgClass="bg-blue-500/15 text-blue-400"
        />
        <StatCard
          icon={Bot}
          label="Agents"
          value={data.allAgents.length}
          sub={`${global.agents.length} global · ${data.allAgents.length - global.agents.length} project`}
          accentClass="bg-rose-500"
          iconBgClass="bg-rose-500/15 text-rose-400"
        />
        <StatCard
          icon={Terminal}
          label="Commands"
          value={allCommands.length}
          sub={`${global.commands.length} global`}
          accentClass="bg-teal-500"
          iconBgClass="bg-teal-500/15 text-teal-400"
        />
      </div>
    </section>
  );
}
