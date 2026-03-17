"use client";

import { useState } from "react";
import type { ProjectInfo, GlobalConfig } from "@/lib/scanner";
import {
  Server,
  Wrench,
  Bot,
  Plug,
  Trash2,
  ChevronLeft,
  ExternalLink,
} from "lucide-react";

interface Props {
  project: ProjectInfo;
  globalConfig: GlobalConfig;
  onMutate: (body: Record<string, unknown>) => Promise<unknown>;
  onBack: () => void;
}

export function ProjectDetail({ project, globalConfig, onMutate, onBack }: Props) {
  const [confirming, setConfirming] = useState<string | null>(null);

  const handleRemoveMCP = (mcpName: string) => {
    if (confirming === mcpName) {
      onMutate({ action: "removeMCP", projectName: project.name, mcpName });
      setConfirming(null);
    } else {
      setConfirming(mcpName);
      setTimeout(() => setConfirming(null), 3000);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="mb-3 flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ChevronLeft size={16} />
          All Projects
        </button>
        <h2 className="text-2xl font-semibold text-zinc-100">{project.name}</h2>
        <p className="mt-1 text-sm text-zinc-500 font-mono">{project.path}</p>
      </div>

      {/* Summary */}
      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Project Summary
        </h3>
        <p className="text-sm leading-relaxed text-zinc-300">
          {project.summary}
        </p>
        {project.techStack.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.techStack.map(tech => (
              <span key={tech} className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {tech}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* MCP Servers */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Server size={16} className="text-emerald-400" />
            MCP Servers
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
              {project.mcpServers.length}
            </span>
          </h3>
          {project.mcpServers.length === 0 ? (
            <p className="text-sm text-zinc-600 italic">No MCP servers connected to this project</p>
          ) : (
            <div className="space-y-3">
              {project.mcpServers.map(mcp => (
                <div key={mcp.name} className="rounded-lg bg-zinc-800/50 p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-zinc-200">{mcp.name}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                          mcp.source === "mcp.json"
                            ? "bg-blue-500/15 text-blue-400"
                            : "bg-zinc-700 text-zinc-500"
                        }`}>
                          {mcp.source}
                        </span>
                        {mcp.hasAuth && (
                          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-400">auth</span>
                        )}
                      </div>
                      {mcp.url && (
                        <p className="mt-1 truncate font-mono text-xs text-zinc-600">{mcp.url}</p>
                      )}
                      {mcp.tools.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {mcp.tools.map(t => (
                            <span key={t} className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400/80">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveMCP(mcp.name)}
                      className={`ml-2 shrink-0 rounded p-1.5 transition-colors ${
                        confirming === mcp.name
                          ? "bg-red-500/20 text-red-400"
                          : "text-zinc-600 hover:bg-zinc-700 hover:text-zinc-400"
                      }`}
                      title={confirming === mcp.name ? "Click again to confirm removal" : "Remove MCP"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Global Augmentations available to this project */}
        <div className="space-y-6">
          {/* Global Plugins */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Plug size={16} className="text-purple-400" />
              Global Plugins
              <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs text-purple-400">
                {globalConfig.plugins.length}
              </span>
            </h3>
            {globalConfig.plugins.length === 0 ? (
              <p className="text-sm text-zinc-600 italic">No plugins installed</p>
            ) : (
              <div className="space-y-2">
                {globalConfig.plugins.map(plugin => (
                  <div key={plugin.name} className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2">
                    <span className="text-sm text-zinc-300">{plugin.shortName}</span>
                    <span className={`rounded px-2 py-0.5 text-xs ${
                      plugin.enabled
                        ? "bg-purple-500/15 text-purple-400"
                        : "bg-zinc-700 text-zinc-500"
                    }`}>
                      {plugin.enabled ? "active" : "disabled"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Project Skills */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Wrench size={16} className="text-blue-400" />
              Skills
              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-400">
                {project.skills.length + globalConfig.skills.length}
              </span>
            </h3>
            {project.skills.length > 0 && (
              <div className="mb-3">
                <div className="mb-1.5 text-xs text-zinc-500">Project-specific</div>
                <div className="flex flex-wrap gap-1.5">
                  {project.skills.map(s => (
                    <span key={s.name} className="rounded bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[11px] text-blue-400">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="mb-1.5 text-xs text-zinc-500">
                Global ({globalConfig.skills.length} skills)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {globalConfig.skills.slice(0, 8).map(s => (
                  <span key={`${s.namespace}:${s.name}`} className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-500">
                    /{s.namespace}:{s.name}
                  </span>
                ))}
                {globalConfig.skills.length > 8 && (
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-600">
                    +{globalConfig.skills.length - 8} more
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Agents */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Bot size={16} className="text-rose-400" />
              Agents
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs text-rose-400">
                {project.agents.length + globalConfig.agents.length}
              </span>
            </h3>
            {project.agents.length > 0 && (
              <div className="mb-3">
                <div className="mb-1.5 text-xs text-zinc-500">Project-specific</div>
                <div className="flex flex-wrap gap-1.5">
                  {project.agents.map(a => (
                    <span key={a.name} className="rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[11px] text-rose-400">
                      {a.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="mb-1.5 text-xs text-zinc-500">Global ({globalConfig.agents.length})</div>
              <div className="flex flex-wrap gap-1.5">
                {globalConfig.agents.slice(0, 8).map(a => (
                  <span key={a.name} className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-500">
                    {a.name}
                  </span>
                ))}
                {globalConfig.agents.length > 8 && (
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-600">
                    +{globalConfig.agents.length - 8} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
