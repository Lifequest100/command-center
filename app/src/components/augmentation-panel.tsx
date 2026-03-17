"use client";

import { useState, useCallback } from "react";
import type { ScanResult } from "@/lib/scanner";
import {
  Server, Plug, Bot, Wrench, Trash2,
  ToggleLeft, ToggleRight, ChevronDown, ChevronRight,
  Activity, CheckCircle2, XCircle, HelpCircle, Loader2,
} from "lucide-react";

interface Props {
  data: ScanResult;
  onMutate: (body: Record<string, unknown>) => Promise<unknown>;
}

// ── MCP category taxonomy ────────────────────────────────────────────
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  data:          ["database", "postgres", "mysql", "sqlite", "supabase", "mongodb", "redis", "sql", "db", "prisma", "drizzle"],
  web:           ["browser", "puppeteer", "playwright", "scrape", "fetch", "http", "web", "chrome", "crawl", "search"],
  code:          ["github", "git", "code", "lint", "test", "typescript", "python", "gitlab", "bitbucket"],
  productivity:  ["notion", "linear", "jira", "slack", "calendar", "todo", "obsidian", "asana", "trello"],
  devops:        ["docker", "kubernetes", "render", "vercel", "aws", "gcp", "azure", "deploy", "ci", "terraform"],
  ai:            ["openai", "anthropic", "claude", "llm", "embedding", "vector", "langchain", "openrouter"],
  media:         ["image", "video", "audio", "file", "pdf", "screenshot", "figma", "canvas"],
  communication: ["email", "gmail", "slack", "discord", "telegram", "twilio", "sms"],
};

const CATEGORY_COLORS: Record<string, string> = {
  data:          "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  web:           "bg-blue-500/15 text-blue-400 border-blue-500/20",
  code:          "bg-violet-500/15 text-violet-400 border-violet-500/20",
  productivity:  "bg-amber-500/15 text-amber-400 border-amber-500/20",
  devops:        "bg-orange-500/15 text-orange-400 border-orange-500/20",
  ai:            "bg-rose-500/15 text-rose-400 border-rose-500/20",
  media:         "bg-pink-500/15 text-pink-400 border-pink-500/20",
  communication: "bg-green-500/15 text-green-400 border-green-500/20",
};

function getMCPCategory(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return null;
}

type HealthStatus = "ok" | "error" | "unknown" | "loading";

function HealthBadge({ status }: { status: HealthStatus }) {
  if (status === "loading") return <Loader2 size={12} className="animate-spin text-[var(--muted)]" />;
  if (status === "ok")      return <CheckCircle2 size={12} className="text-emerald-400" />;
  if (status === "error")   return <XCircle size={12} className="text-rose-400" />;
  return <HelpCircle size={12} className="text-[var(--muted-2)]" />;
}

const ALL_CATEGORIES = Object.keys(CATEGORY_KEYWORDS);

export function AugmentationPanel({ data, onMutate }: Props) {
  const [expanded, setExpanded] = useState<string | null>("mcps");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [health, setHealth] = useState<Record<string, HealthStatus>>({});
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const toggle = (key: string) => setExpanded(expanded === key ? null : key);

  const checkHealth = useCallback(async () => {
    setCheckingHealth(true);
    const keys = Array.from(new Set(data.allMCPs.map(m => m.name)));
    const loading: Record<string, HealthStatus> = {};
    keys.forEach(k => { loading[k] = "loading"; });
    setHealth(loading);

    try {
      const res = await fetch("/api/health");
      const result = await res.json() as { health: Record<string, HealthStatus> };
      setHealth(result.health);
    } catch {
      const err: Record<string, HealthStatus> = {};
      keys.forEach(k => { err[k] = "unknown"; });
      setHealth(err);
    } finally {
      setCheckingHealth(false);
    }
  }, [data.allMCPs]);

  // Group MCPs by name
  const mcpsByName = new Map<string, { projects: string[]; tools: string[]; url?: string; command?: string; args?: string[] }>();
  for (const mcp of data.allMCPs) {
    const existing = mcpsByName.get(mcp.name);
    if (existing) {
      if (!existing.projects.includes(mcp.project)) existing.projects.push(mcp.project);
      existing.tools = [...new Set([...existing.tools, ...mcp.tools])];
    } else {
      mcpsByName.set(mcp.name, {
        projects: [mcp.project],
        tools: [...mcp.tools],
        url: mcp.url,
        command: mcp.command,
        args: mcp.args,
      });
    }
  }

  // Apply category filter to MCPs
  const filteredMCPs = Array.from(mcpsByName.entries()).filter(([name]) => {
    if (!categoryFilter) return true;
    return getMCPCategory(name) === categoryFilter;
  });

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-2)]">
        Augmentations
      </h2>

      <div className="space-y-2">
        {/* ── MCPs ─────────────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div
            onClick={() => toggle("mcps")}
            className="flex w-full cursor-pointer items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-[var(--surface-2)]/60"
          >
            <div className="flex items-center gap-2.5">
              <Server size={15} className="text-emerald-400" />
              <span className="text-sm font-medium text-[var(--foreground)]">MCP Servers</span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
                {mcpsByName.size}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Health check button */}
              <button
                onClick={e => { e.stopPropagation(); checkHealth(); }}
                disabled={checkingHealth}
                className="flex items-center gap-1 rounded-md border border-[var(--border-2)] bg-[var(--surface-2)] px-2 py-1 text-[10px] text-[var(--muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50"
                title="Check if MCPs are reachable"
              >
                <Activity size={10} className={checkingHealth ? "animate-pulse" : ""} />
                Health
              </button>
              {expanded === "mcps" ? <ChevronDown size={15} className="text-[var(--muted)]" /> : <ChevronRight size={15} className="text-[var(--muted)]" />}
            </div>
          </div>

          {expanded === "mcps" && (
            <div className="border-t border-[var(--border)]">
              {/* Category filter */}
              <div className="flex flex-wrap gap-1.5 px-5 py-3 border-b border-[var(--border)]">
                <button
                  onClick={() => setCategoryFilter(null)}
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                    !categoryFilter
                      ? "border-[var(--border-2)] bg-[var(--surface-2)] text-[var(--foreground)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-2)]"
                  }`}
                >
                  All
                </button>
                {ALL_CATEGORIES.map(cat => {
                  const count = Array.from(mcpsByName.keys()).filter(n => getMCPCategory(n) === cat).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors capitalize ${
                        categoryFilter === cat
                          ? CATEGORY_COLORS[cat]
                          : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-2)]"
                      }`}
                    >
                      {cat} <span className="opacity-60">{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="divide-y divide-[var(--border)]/50">
                {filteredMCPs.map(([name, info]) => {
                  const category = getMCPCategory(name);
                  const healthStatus = health[name] ?? "unknown";
                  return (
                    <div key={name} className="flex items-start justify-between px-5 py-3 hover:bg-[var(--surface-2)]/40">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-[var(--foreground)]">{name}</span>
                          {category && (
                            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide capitalize ${CATEGORY_COLORS[category]}`}>
                              {category}
                            </span>
                          )}
                          <HealthBadge status={healthStatus} />
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          {info.projects.map(p => (
                            <span key={p} className="rounded bg-[var(--surface-2)] border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">{p}</span>
                          ))}
                        </div>
                        {info.tools.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {info.tools.slice(0, 5).map(t => (
                              <span key={t} className="rounded bg-emerald-500/8 border border-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] text-emerald-400/80">{t}</span>
                            ))}
                            {info.tools.length > 5 && (
                              <span className="text-[10px] text-[var(--muted-2)]">+{info.tools.length - 5}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="ml-3 flex shrink-0 flex-col gap-1">
                        {info.projects.map(project => (
                          <button
                            key={`${name}-${project}`}
                            onClick={() => {
                              const key = `${name}-${project}`;
                              if (confirming === key) {
                                onMutate({ action: "removeMCP", projectName: project, mcpName: name });
                                setConfirming(null);
                              } else {
                                setConfirming(key);
                                setTimeout(() => setConfirming(null), 3000);
                              }
                            }}
                            className={`rounded p-1.5 transition-colors ${
                              confirming === `${name}-${project}`
                                ? "bg-red-500/20 text-red-400"
                                : "text-[var(--muted-2)] hover:bg-[var(--surface-2)] hover:text-[var(--muted)]"
                            }`}
                            title={confirming === `${name}-${project}` ? `Confirm remove from ${project}` : `Remove from ${project}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {filteredMCPs.length === 0 && (
                  <div className="px-5 py-4 text-sm text-[var(--muted)] italic">
                    {categoryFilter ? `No ${categoryFilter} MCPs configured` : "No MCP servers configured"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Plugins ──────────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div
            onClick={() => toggle("plugins")}
            className="flex w-full cursor-pointer items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-[var(--surface-2)]/60"
          >
            <div className="flex items-center gap-2.5">
              <Plug size={15} className="text-violet-400" />
              <span className="text-sm font-medium text-[var(--foreground)]">Plugins</span>
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-400">
                {data.allPlugins.length}
              </span>
            </div>
            {expanded === "plugins" ? <ChevronDown size={15} className="text-[var(--muted)]" /> : <ChevronRight size={15} className="text-[var(--muted)]" />}
          </div>
          {expanded === "plugins" && (
            <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]/50">
              {data.allPlugins.map(plugin => (
                <div key={plugin.name} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--surface-2)]/40">
                  <div>
                    <span className="font-medium text-sm text-[var(--foreground)]">{plugin.shortName}</span>
                    <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                      Updated {new Date(plugin.lastUpdated).toLocaleDateString()} · global
                    </div>
                  </div>
                  <button
                    onClick={() => onMutate({ action: "togglePlugin", pluginName: plugin.name, enabled: !plugin.enabled })}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all ${
                      plugin.enabled
                        ? "border-violet-500/30 bg-violet-500/15 text-violet-400 hover:bg-violet-500/25"
                        : "border-[var(--border-2)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {plugin.enabled ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                    {plugin.enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
              ))}
              {data.allPlugins.length === 0 && (
                <div className="px-5 py-4 text-sm text-[var(--muted)] italic">No plugins installed</div>
              )}
            </div>
          )}
        </div>

        {/* ── Skills ───────────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div
            onClick={() => toggle("skills")}
            className="flex w-full cursor-pointer items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-[var(--surface-2)]/60"
          >
            <div className="flex items-center gap-2.5">
              <Wrench size={15} className="text-blue-400" />
              <span className="text-sm font-medium text-[var(--foreground)]">Skills</span>
              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-400">
                {data.allSkills.length}
              </span>
            </div>
            {expanded === "skills" ? <ChevronDown size={15} className="text-[var(--muted)]" /> : <ChevronRight size={15} className="text-[var(--muted)]" />}
          </div>
          {expanded === "skills" && (
            <div className="border-t border-[var(--border)] px-5 py-3">
              {Object.entries(
                data.allSkills.reduce((acc, s) => {
                  const key = s.scope === "global" ? `global / ${s.namespace}` : `${s.project}`;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(s);
                  return acc;
                }, {} as Record<string, typeof data.allSkills>)
              ).map(([group, skills]) => (
                <div key={group} className="mb-3 last:mb-0">
                  <p className="mb-1.5 text-[11px] font-medium text-[var(--muted)]">
                    {group} <span className="text-[var(--muted-2)]">({skills.length})</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map(s => (
                      <span
                        key={`${s.namespace}-${s.name}`}
                        className={`rounded border px-2 py-0.5 text-[10px] ${
                          s.scope === "global"
                            ? "border-blue-500/20 bg-blue-500/8 text-blue-400/80"
                            : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]"
                        }`}
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {data.allSkills.length === 0 && (
                <p className="text-sm text-[var(--muted)] italic">No skills installed</p>
              )}
            </div>
          )}
        </div>

        {/* ── Agents ───────────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div
            onClick={() => toggle("agents")}
            className="flex w-full cursor-pointer items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-[var(--surface-2)]/60"
          >
            <div className="flex items-center gap-2.5">
              <Bot size={15} className="text-rose-400" />
              <span className="text-sm font-medium text-[var(--foreground)]">Agents</span>
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs text-rose-400">
                {data.allAgents.length}
              </span>
            </div>
            {expanded === "agents" ? <ChevronDown size={15} className="text-[var(--muted)]" /> : <ChevronRight size={15} className="text-[var(--muted)]" />}
          </div>
          {expanded === "agents" && (
            <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]/50">
              {data.allAgents.map(agent => (
                <div key={`${agent.scope}-${agent.name}`} className="flex items-center justify-between px-5 py-2.5 hover:bg-[var(--surface-2)]/40">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--foreground)]">{agent.name}</span>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] ${
                      agent.scope === "global"
                        ? "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]"
                        : "border-blue-500/20 bg-blue-500/8 text-blue-400"
                    }`}>
                      {agent.scope === "global" ? "global" : agent.project}
                    </span>
                  </div>
                  {agent.scope === "global" && (
                    <button
                      onClick={() => {
                        const key = `agent-${agent.name}`;
                        if (confirming === key) {
                          onMutate({ action: "removeAgent", agentName: agent.name });
                          setConfirming(null);
                        } else {
                          setConfirming(key);
                          setTimeout(() => setConfirming(null), 3000);
                        }
                      }}
                      className={`rounded p-1 transition-colors ${
                        confirming === `agent-${agent.name}`
                          ? "bg-red-500/20 text-red-400"
                          : "text-[var(--muted-2)] hover:text-[var(--muted)]"
                      }`}
                      title={confirming === `agent-${agent.name}` ? "Confirm remove" : "Remove agent"}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              {data.allAgents.length === 0 && (
                <div className="px-5 py-4 text-sm text-[var(--muted)] italic">No agents installed</div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
