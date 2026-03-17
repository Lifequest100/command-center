"use client";

import { useState } from "react";
import type { ProjectInfo, ScanResult } from "@/lib/scanner";
import type { Suggestion } from "@/app/api/suggest/route";
import {
  Search, X, ExternalLink, Star, Server, Plug, Wrench, Sparkles,
  Loader2, Download, Check, ChevronDown, ChevronUp, Bot,
} from "lucide-react";

interface SearchResult {
  name: string;
  description: string;
  url: string;
  stars?: number;
  source: "github";
  type: "mcp" | "plugin" | "skill";
  relevance: string;
  repoFullName: string;
}

interface Props {
  projects: ProjectInfo[];
  scanData: ScanResult;
  onClose: () => void;
  onInstalled: () => void;
}

const typeConfig = {
  mcp:    { icon: Server, label: "MCP Servers" },
  plugin: { icon: Plug,   label: "Plugins"     },
  skill:  { icon: Wrench, label: "Skills"      },
};

const relevanceColors: Record<string, string> = {
  high:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low:    "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]",
};

const suggTypeColors: Record<string, string> = {
  mcp:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  plugin: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  skill:  "bg-blue-500/15 text-blue-400 border-blue-500/20",
};

function isInstalled(result: SearchResult | { repoFullName: string; type: string }, scanData: ScanResult): boolean {
  const repoShort = result.repoFullName?.split("/")[1]?.toLowerCase() ?? "";
  if (result.type === "mcp")    return scanData.allMCPs.some(m => m.name.toLowerCase().includes(repoShort) || repoShort.includes(m.name.toLowerCase()));
  if (result.type === "skill")  return scanData.allSkills.some(s => s.name.toLowerCase().includes(repoShort) || repoShort.includes(s.name.toLowerCase()));
  if (result.type === "plugin") return scanData.allPlugins.some(p => p.shortName.toLowerCase().includes(repoShort) || repoShort.includes(p.shortName.toLowerCase()));
  return false;
}

function InstallWidget({ result, projects, onInstalled }: { result: SearchResult | Suggestion; projects: ProjectInfo[]; onInstalled: () => void }) {
  const repoFull = "repoFullName" in result ? result.repoFullName : result.repo ?? "";
  const [open, setOpen] = useState(false);
  const [targetProject, setTargetProject] = useState(projects[0]?.name ?? "");
  const [namespace, setNamespace] = useState(repoFull.split("/")[1] ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const install = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoFullName: repoFull,
          type: result.type,
          targetProject: result.type === "mcp" ? targetProject : undefined,
          namespace: result.type === "skill" ? namespace : undefined,
        }),
      });
      const data = await res.json() as { ok: boolean; message: string };
      setMessage({ ok: data.ok, text: data.message });
      if (data.ok) onInstalled();
    } catch (e) {
      setMessage({ ok: false, text: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        className="flex items-center gap-1 rounded-md border border-[var(--border-2)] bg-[var(--surface-2)] px-2 py-1 text-[11px] text-[var(--muted)] transition-colors hover:border-amber-500/40 hover:text-[var(--foreground)] shrink-0"
      >
        <Download size={10} />
        Install
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>

      {open && (
        <div
          onClick={e => { e.preventDefault(); e.stopPropagation(); }}
          className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-2)] bg-[var(--surface-2)] p-2"
        >
          {result.type === "mcp" && (
            <select
              value={targetProject}
              onChange={e => setTargetProject(e.target.value)}
              className="rounded border border-[var(--border-2)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--foreground)] outline-none"
            >
              {projects.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          )}
          {result.type === "skill" && (
            <input
              value={namespace}
              onChange={e => setNamespace(e.target.value)}
              placeholder="namespace"
              className="w-32 rounded border border-[var(--border-2)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--foreground)] outline-none"
            />
          )}
          <button
            onClick={install}
            disabled={loading}
            className="flex items-center gap-1 rounded bg-amber-500 px-3 py-1 text-[11px] font-semibold text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
            {loading ? "Installing…" : "Confirm"}
          </button>
          {message && (
            <span className={`text-[11px] ${message.ok ? "text-emerald-400" : "text-rose-400"}`}>{message.text}</span>
          )}
        </div>
      )}
    </div>
  );
}

type PanelTab = "search" | "ai";

export function DiscoverPanel({ projects, scanData, onClose, onInstalled }: Props) {
  const [panelTab, setPanelTab] = useState<PanelTab>("search");

  // Search state
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"mcp" | "plugin" | "skill">("mcp");
  const [contextProject, setContextProject] = useState<string>("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // AI suggest state
  const [aiProject, setAiProject] = useState(projects[0]?.name ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSearched, setAiSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const projectData = projects.find(p => p.name === contextProject);
      const projectContext = projectData ? `${projectData.summary} ${projectData.techStack.join(" ")}` : "";
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, type: searchType, projectContext }),
      });
      const data = await res.json() as { results?: SearchResult[] };
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAISuggest = async () => {
    const project = projects.find(p => p.name === aiProject);
    if (!project) return;
    setAiLoading(true);
    setAiError(null);
    setAiSearched(true);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: project.name,
          projectSummary: `${project.summary} Stack: ${project.techStack.join(", ")}`,
          currentMCPs: project.mcpServers.map(m => m.name),
        }),
      });
      const data = await res.json() as { suggestions?: Suggestion[]; error?: string };
      if (data.error) { setAiError(data.error); setSuggestions([]); }
      else setSuggestions(data.suggestions ?? []);
    } catch (e) {
      setAiError(String(e));
    } finally {
      setAiLoading(false);
    }
  };

  const GhIcon = () => (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );

  return (
    <section className="mb-8 rounded-xl border border-amber-500/25 bg-[var(--surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
        <div className="flex items-center gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <Search size={14} className="text-amber-400" />
            Discover
          </h2>
          <div className="flex rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
            <button
              onClick={() => setPanelTab("search")}
              className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs transition-colors ${
                panelTab === "search" ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <GhIcon />
              GitHub
            </button>
            <button
              onClick={() => setPanelTab("ai")}
              className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs transition-colors ${
                panelTab === "ai" ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Sparkles size={11} />
              AI Suggest
            </button>
          </div>
        </div>
        <button onClick={onClose} className="rounded p-1 text-[var(--muted)] hover:text-[var(--foreground)]">
          <X size={15} />
        </button>
      </div>

      <div className="p-5">
        {/* ── GitHub Search ─────────────────────────────────────── */}
        {panelTab === "search" && (
          <>
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
                {(["mcp", "plugin", "skill"] as const).map(type => {
                  const Icon = typeConfig[type].icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setSearchType(type)}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-all ${
                        searchType === type
                          ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      <Icon size={11} />
                      {typeConfig[type].label}
                    </button>
                  );
                })}
              </div>
              <select
                value={contextProject}
                onChange={e => setContextProject(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--foreground)] outline-none"
              >
                <option value="">No project context</option>
                {projects.map(p => <option key={p.name} value={p.name}>Context: {p.name}</option>)}
              </select>
            </div>

            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder={`Search GitHub for ${searchType === "mcp" ? "MCP servers" : searchType}s…`}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-amber-500/50 transition-colors"
              />
              <button
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : "Search"}
              </button>
            </div>

            {searched && (
              <div className="space-y-2">
                {results.length === 0 && !loading && (
                  <p className="py-4 text-center text-sm text-[var(--muted)]">No results — try a different query.</p>
                )}
                {results.map((result, i) => {
                  const installed = isInstalled(result, scanData);
                  return (
                    <div
                      key={`${result.repoFullName}-${i}`}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 p-3 transition-colors hover:border-[var(--border-2)]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[var(--surface-2)] text-[var(--muted)]">
                          <GhIcon />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm font-medium text-[var(--foreground)] hover:text-white hover:underline"
                              onClick={e => e.stopPropagation()}
                            >
                              {result.name}
                              <ExternalLink size={9} className="text-[var(--muted-2)]" />
                            </a>
                            {result.stars != null && result.stars > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-[var(--muted)]">
                                <Star size={9} />
                                {result.stars > 1000 ? `${(result.stars / 1000).toFixed(1)}k` : result.stars}
                              </span>
                            )}
                            {result.relevance && (
                              <span className={`rounded border px-1.5 py-0.5 text-[10px] ${relevanceColors[result.relevance] || relevanceColors.low}`}>
                                {result.relevance}
                              </span>
                            )}
                            {installed && (
                              <span className="flex items-center gap-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                                <Check size={9} /> installed
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] text-[var(--muted)] line-clamp-2">{result.description || "No description"}</p>
                        </div>
                        <div className="shrink-0">
                          <InstallWidget result={result} projects={projects} onInstalled={onInstalled} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── AI Suggest ────────────────────────────────────────── */}
        {panelTab === "ai" && (
          <>
            <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-[var(--muted)]">
              Claude analyses your project context and suggests relevant MCPs, plugins, and skills.
              Requires <code className="rounded bg-[var(--surface-2)] px-1 font-mono text-[10px]">ANTHROPIC_API_KEY</code> in <code className="rounded bg-[var(--surface-2)] px-1 font-mono text-[10px]">.env.local</code>.
            </div>

            <div className="mb-4 flex gap-2">
              <select
                value={aiProject}
                onChange={e => setAiProject(e.target.value)}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none"
              >
                {projects.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
              <button
                onClick={handleAISuggest}
                disabled={aiLoading || !aiProject}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
              >
                {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={14} />}
                Suggest
              </button>
            </div>

            {aiError && (
              <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-400">
                {aiError}
              </div>
            )}

            {aiSearched && !aiLoading && suggestions.length > 0 && (
              <div className="space-y-2">
                {suggestions.map((s, i) => {
                  const TypeIcon = s.type === "mcp" ? Server : s.type === "skill" ? Wrench : s.type === "plugin" ? Plug : Bot;
                  const repoAsSearchResult = s.repo ? {
                    repoFullName: s.repo,
                    type: s.type,
                    name: s.name,
                    description: s.description,
                    url: `https://github.com/${s.repo}`,
                    stars: undefined,
                    source: "github" as const,
                    relevance: "high",
                  } : null;

                  return (
                    <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 p-3">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded ${suggTypeColors[s.type]}`}>
                          <TypeIcon size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-[var(--foreground)]">{s.name}</span>
                            <span className={`rounded border px-1.5 py-0.5 text-[10px] capitalize ${suggTypeColors[s.type]}`}>{s.type}</span>
                            {s.repo && (
                              <a
                                href={`https://github.com/${s.repo}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-0.5 text-[10px] text-[var(--muted)] hover:text-[var(--foreground)]"
                                onClick={e => e.stopPropagation()}
                              >
                                <GhIcon /> {s.repo}
                              </a>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] text-[var(--muted)]">{s.description}</p>
                          <p className="mt-1 text-[11px] italic text-amber-400/80">{s.reason}</p>
                        </div>
                        {repoAsSearchResult && (
                          <div className="shrink-0">
                            <InstallWidget result={repoAsSearchResult} projects={projects} onInstalled={onInstalled} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {aiSearched && !aiLoading && suggestions.length === 0 && !aiError && (
              <p className="py-4 text-center text-sm text-[var(--muted)]">No suggestions returned. Try a different project.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
