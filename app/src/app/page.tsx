"use client";

import { useEffect, useState, useCallback } from "react";
import type { ScanResult } from "@/lib/scanner";
import { GlobalOverview } from "@/components/global-overview";
import { ProjectCard } from "@/components/project-card";
import { GraphView } from "@/components/graph-view";
import { ProjectDetail } from "@/components/project-detail";
import { AugmentationPanel } from "@/components/augmentation-panel";
import { DiscoverPanel } from "@/components/discover-panel";
import { FilesPanel } from "@/components/files-panel";
import { CommandPalette } from "@/components/command-palette";
import { ActivityLog } from "@/components/activity-log";
import {
  RefreshCw, LayoutGrid, Network, ChevronLeft,
  Telescope, FileText, Activity, Download,
} from "lucide-react";

type Tab = "dashboard" | "files";
type View = "grid" | "graph";

function SkeletonCard() {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="skeleton h-4 w-2/3" />
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-4/5" />
      <div className="skeleton h-1.5 w-full mt-1 rounded-full" />
      <div className="flex gap-2 mt-auto">
        <div className="skeleton h-5 w-12 rounded-full" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <section className="mb-8 animate-fade-up">
      <div className="mb-4 skeleton h-4 w-20 rounded" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <SkeletonCard />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("grid");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showDiscover, setShowDiscover] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scan");
      if (!res.ok) throw new Error("Scan failed");
      setData(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const mutate = useCallback(async (body: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/mutate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.ok) await fetchData();
      return result;
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }, [fetchData]);

  const handleExport = useCallback(() => {
    window.open("/api/export", "_blank");
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      // ⌘K / Ctrl+K — command palette (always)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(o => !o);
        return;
      }

      // Remaining shortcuts fire only when not typing
      if (typing) return;

      if (e.key === "r" || e.key === "R") fetchData();
      if (e.key === "d" || e.key === "D") { setTab("dashboard"); setSelectedProject(null); }
      if (e.key === "f" || e.key === "F") setTab("files");
      if (e.key === "g" || e.key === "G") setView(v => v === "grid" ? "graph" : "grid");
      if (e.key === "l" || e.key === "L") setActivityOpen(o => !o);
      if (e.key === "Escape") {
        if (paletteOpen) { setPaletteOpen(false); return; }
        if (activityOpen) { setActivityOpen(false); return; }
        if (selectedProject) setSelectedProject(null);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [fetchData, paletteOpen, activityOpen, selectedProject]);

  const selectedProjectData = data?.projects.find(p => p.name === selectedProject);

  const switchTab = (t: Tab) => {
    setTab(t);
    if (t === "files") setSelectedProject(null);
  };

  return (
    <div className="min-h-screen">
      {/* ── Command Palette ───────────────────────────────────── */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        data={data}
        onSelectProject={name => { switchTab("dashboard"); setView("grid"); setSelectedProject(name); }}
        onSwitchTab={switchTab}
        onSetView={setView}
        onRescan={fetchData}
        onToggleDiscover={() => { switchTab("dashboard"); setShowDiscover(o => !o); }}
        onToggleActivity={() => setActivityOpen(o => !o)}
        onExport={handleExport}
      />

      {/* ── Activity Log Drawer ───────────────────────────────── */}
      <ActivityLog open={activityOpen} onClose={() => setActivityOpen(false)} />

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
          {/* Left: logo + title */}
          <div className="flex items-center gap-3">
            {selectedProject && tab === "dashboard" && (
              <button
                onClick={() => setSelectedProject(null)}
                className="mr-0.5 rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div
              className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 font-mono text-xs font-black text-black"
              style={{ boxShadow: "0 0 0 1px rgba(245,158,11,0.4), 0 0 16px rgba(245,158,11,0.2)" }}
              onClick={() => setPaletteOpen(true)}
              title="Open command palette (⌘K)"
            >
              CC
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-[var(--foreground)] tracking-tight">
                {selectedProject ? selectedProject : "Command Center"}
              </h1>
              {data && !selectedProject && tab === "dashboard" && (
                <p className="font-mono text-[11px] text-[var(--muted)]">
                  {data.allMCPs.length} MCPs · {data.allPlugins.length} plugins · {data.allSkills.length} skills · {data.allAgents.length} agents
                </p>
              )}
              {selectedProjectData && (
                <p className="max-w-sm truncate text-[11px] text-[var(--muted)]">
                  {selectedProjectData.summary.slice(0, 72)}…
                </p>
              )}
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2">
            {/* Tab switcher */}
            <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
              {(["dashboard", "files"] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    tab === t
                      ? "bg-[var(--surface-2)] text-[var(--foreground)] shadow-sm"
                      : "text-[var(--muted)] hover:text-zinc-300"
                  }`}
                >
                  {t === "dashboard" ? <LayoutGrid size={12} /> : <FileText size={12} />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {tab === "dashboard" && !selectedProject && (
              <>
                <button
                  onClick={() => setShowDiscover(!showDiscover)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    showDiscover
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--border-2)] hover:text-zinc-300"
                  }`}
                >
                  <Telescope size={12} />
                  Discover
                </button>

                <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
                  {(["grid", "graph"] as View[]).map(v => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        view === v
                          ? "bg-[var(--surface-2)] text-[var(--foreground)] shadow-sm"
                          : "text-[var(--muted)] hover:text-zinc-300"
                      }`}
                    >
                      {v === "grid" ? <LayoutGrid size={12} /> : <Network size={12} />}
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Export */}
            <button
              onClick={handleExport}
              title="Export config as JSON"
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-all hover:border-[var(--border-2)] hover:text-zinc-300"
            >
              <Download size={12} />
            </button>

            {/* Activity */}
            <button
              onClick={() => setActivityOpen(o => !o)}
              title="Activity log (L)"
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                activityOpen
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--border-2)] hover:text-zinc-300"
              }`}
            >
              <Activity size={12} />
            </button>

            {/* Command palette trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              title="Command palette (⌘K)"
              className="hidden items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted)] transition-all hover:border-[var(--border-2)] hover:text-zinc-300 sm:flex"
            >
              <kbd className="font-mono text-[10px]">⌘K</kbd>
            </button>

            {tab === "dashboard" && (
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-all hover:border-[var(--border-2)] hover:text-zinc-300 disabled:opacity-40"
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                Rescan
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Keyboard shortcuts hint (subtle footer) ────────────── */}
      <div className="fixed bottom-3 left-1/2 z-40 -translate-x-1/2">
        <div className="flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-1.5 backdrop-blur text-[10px] text-[var(--muted-2)] font-mono opacity-0 hover:opacity-100 transition-opacity pointer-events-none select-none">
          <span><kbd>⌘K</kbd> palette</span>
          <span><kbd>R</kbd> rescan</span>
          <span><kbd>G</kbd> graph</span>
          <span><kbd>L</kbd> log</span>
          <span><kbd>Esc</kbd> back</span>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      <main className="mx-auto max-w-[1600px] px-6 py-8">
        {tab === "files" && <FilesPanel />}

        {tab === "dashboard" && (
          <>
            {error && (
              <div className="mb-6 rounded-lg border border-rose-800/60 bg-rose-950/30 px-4 py-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            {loading && !data && (
              <div className="animate-fade-up">
                <div className="mb-8">
                  <div className="skeleton mb-4 h-3 w-16 rounded" />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {[0, 1, 2, 3, 4].map(i => (
                      <div key={i} className="card p-5 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <div className="skeleton h-7 w-7 rounded-lg" />
                          <div className="skeleton h-3 w-20 rounded" />
                        </div>
                        <div className="skeleton h-8 w-16 rounded" />
                        <div className="skeleton h-3 w-4/5 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
                <LoadingGrid />
              </div>
            )}

            {data && !selectedProject && (
              <div className="animate-fade-up">
                {showDiscover && (
                  <DiscoverPanel
                    projects={data.projects}
                    scanData={data}
                    onClose={() => setShowDiscover(false)}
                    onInstalled={fetchData}
                  />
                )}
                <GlobalOverview data={data} onMutate={mutate} />
                <AugmentationPanel data={data} onMutate={mutate} />

                {view === "grid" ? (
                  <section className="mb-8">
                    <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-[var(--muted-2)]">
                      Projects
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {data.projects.map((project, i) => (
                        <div key={project.name} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                          <ProjectCard project={project} onClick={() => setSelectedProject(project.name)} />
                        </div>
                      ))}
                    </div>
                    {data.projects.length === 0 && (
                      <div className="card flex flex-col items-center justify-center py-16 text-center">
                        <p className="mb-1 text-sm font-medium text-[var(--foreground)]">No projects found</p>
                        <p className="text-xs text-[var(--muted)]">
                          Set <code className="rounded bg-[var(--surface-2)] px-1 font-mono text-[10px]">CLAUDE_CC_PROJECTS_DIR</code> in{" "}
                          <code className="rounded bg-[var(--surface-2)] px-1 font-mono text-[10px]">.env.local</code>
                        </p>
                      </div>
                    )}
                  </section>
                ) : (
                  <section className="mb-8">
                    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]" style={{ height: "70vh" }}>
                      <GraphView data={data} onSelectProject={name => setSelectedProject(name)} />
                    </div>
                  </section>
                )}
              </div>
            )}

            {data && selectedProjectData && (
              <div className="animate-fade-up">
                <ProjectDetail
                  project={selectedProjectData}
                  globalConfig={data.global}
                  onMutate={mutate}
                  onBack={() => setSelectedProject(null)}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
