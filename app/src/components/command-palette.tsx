"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { ScanResult } from "@/lib/scanner";
import {
  Search, LayoutGrid, Network, FileText, Telescope, RefreshCw,
  FolderOpen, Server, Wrench, Bot, Download, Activity, X,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  data: ScanResult | null;
  onSelectProject: (name: string) => void;
  onSwitchTab: (tab: "dashboard" | "files") => void;
  onSetView: (view: "grid" | "graph") => void;
  onRescan: () => void;
  onToggleDiscover: () => void;
  onToggleActivity: () => void;
  onExport: () => void;
}

interface PaletteItem {
  id: string;
  label: string;
  sub?: string;
  icon: typeof Search;
  iconColor: string;
  group: string;
  action: () => void;
  keywords?: string;
}

export function CommandPalette({
  open, onClose, data,
  onSelectProject, onSwitchTab, onSetView,
  onRescan, onToggleDiscover, onToggleActivity, onExport,
}: Props) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const buildItems = useCallback((): PaletteItem[] => {
    const items: PaletteItem[] = [
      // Navigation
      {
        id: "nav-dashboard",
        label: "Dashboard",
        sub: "Switch to dashboard tab",
        icon: LayoutGrid,
        iconColor: "text-amber-400",
        group: "Navigation",
        action: () => { onSwitchTab("dashboard"); onClose(); },
        keywords: "home overview",
      },
      {
        id: "nav-files",
        label: "Files",
        sub: "Edit agents, skills, CLAUDE.md, primers",
        icon: FileText,
        iconColor: "text-blue-400",
        group: "Navigation",
        action: () => { onSwitchTab("files"); onClose(); },
        keywords: "editor markdown",
      },
      {
        id: "nav-graph",
        label: "Graph View",
        sub: "Visualise project connections",
        icon: Network,
        iconColor: "text-violet-400",
        group: "Navigation",
        action: () => { onSwitchTab("dashboard"); onSetView("graph"); onClose(); },
        keywords: "network visualise",
      },
      {
        id: "nav-grid",
        label: "Grid View",
        sub: "Project card grid",
        icon: LayoutGrid,
        iconColor: "text-zinc-400",
        group: "Navigation",
        action: () => { onSwitchTab("dashboard"); onSetView("grid"); onClose(); },
      },
      // Actions
      {
        id: "action-rescan",
        label: "Rescan",
        sub: "Refresh Claude config from disk",
        icon: RefreshCw,
        iconColor: "text-emerald-400",
        group: "Actions",
        action: () => { onRescan(); onClose(); },
        keywords: "refresh reload",
      },
      {
        id: "action-discover",
        label: "Discover",
        sub: "Search GitHub for MCPs, plugins and skills",
        icon: Telescope,
        iconColor: "text-amber-400",
        group: "Actions",
        action: () => { onSwitchTab("dashboard"); onToggleDiscover(); onClose(); },
        keywords: "search find install",
      },
      {
        id: "action-activity",
        label: "Activity Log",
        sub: "See recent configuration changes",
        icon: Activity,
        iconColor: "text-rose-400",
        group: "Actions",
        action: () => { onToggleActivity(); onClose(); },
        keywords: "history log changes",
      },
      {
        id: "action-export",
        label: "Export Config",
        sub: "Download Claude config as JSON",
        icon: Download,
        iconColor: "text-blue-400",
        group: "Actions",
        action: () => { onExport(); onClose(); },
        keywords: "backup download json",
      },
    ];

    // Projects
    if (data?.projects) {
      for (const p of data.projects) {
        items.push({
          id: `project-${p.name}`,
          label: p.name,
          sub: `${p.mcpServers.length} MCPs · ${p.skills.length} skills`,
          icon: FolderOpen,
          iconColor: "text-blue-400",
          group: "Projects",
          action: () => { onSwitchTab("dashboard"); onSetView("grid"); onSelectProject(p.name); onClose(); },
          keywords: p.techStack.join(" "),
        });
      }
    }

    // MCPs
    if (data?.allMCPs) {
      const seen = new Set<string>();
      for (const mcp of data.allMCPs) {
        if (seen.has(mcp.name)) continue;
        seen.add(mcp.name);
        items.push({
          id: `mcp-${mcp.name}`,
          label: mcp.name,
          sub: `MCP · ${mcp.project}`,
          icon: Server,
          iconColor: "text-emerald-400",
          group: "MCPs",
          action: () => { onSwitchTab("dashboard"); onSelectProject(mcp.project); onClose(); },
        });
      }
    }

    // Skills
    if (data?.allSkills) {
      for (const s of data.allSkills) {
        items.push({
          id: `skill-${s.namespace}-${s.name}`,
          label: s.name,
          sub: `Skill · ${s.namespace}`,
          icon: Wrench,
          iconColor: "text-blue-400",
          group: "Skills",
          action: () => { onSwitchTab("files"); onClose(); },
        });
      }
    }

    // Agents
    if (data?.allAgents) {
      for (const a of data.allAgents) {
        items.push({
          id: `agent-${a.name}`,
          label: a.name,
          sub: `Agent · ${a.scope}`,
          icon: Bot,
          iconColor: "text-rose-400",
          group: "Agents",
          action: () => { onSwitchTab("files"); onClose(); },
        });
      }
    }

    return items;
  }, [data, onClose, onSelectProject, onSwitchTab, onSetView, onRescan, onToggleDiscover, onToggleActivity, onExport]);

  const allItems = buildItems();

  const filtered = query.trim()
    ? allItems.filter(item => {
        const q = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.sub?.toLowerCase().includes(q) ||
          item.keywords?.toLowerCase().includes(q) ||
          item.group.toLowerCase().includes(q)
        );
      })
    : allItems.filter(i => i.group === "Navigation" || i.group === "Actions" || i.group === "Projects");

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setCursor(0); }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && filtered[cursor]) { filtered[cursor].action(); }
    if (e.key === "Escape") { onClose(); }
  };

  // Scroll cursor into view
  useEffect(() => {
    const el = listRef.current?.children[cursor] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  // Group the filtered items for display
  type IndexedItem = PaletteItem & { flatIndex: number };
  const groups: Record<string, IndexedItem[]> = {};
  let flatIndex = 0;
  const indexedItems: IndexedItem[] = filtered.map(item => ({
    ...item,
    flatIndex: flatIndex++,
  }));
  for (const item of indexedItems) {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-[var(--border-2)] bg-[var(--surface)] shadow-2xl"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          <Search size={16} className="shrink-0 text-[var(--muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search commands, projects, MCPs…"
            className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-[var(--muted)] hover:text-[var(--foreground)]">
              <X size={14} />
            </button>
          )}
          <kbd className="hidden rounded border border-[var(--border-2)] bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)] sm:inline">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">No results for &ldquo;{query}&rdquo;</p>
          )}

          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-2)]">
                {group}
              </p>
              {items.map(item => {
                const Icon = item.icon;
                const active = item.flatIndex === cursor;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setCursor(item.flatIndex)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                      active ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]/50"
                    }`}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)] ${item.iconColor}`}>
                      <Icon size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[var(--foreground)] truncate">{item.label}</p>
                      {item.sub && (
                        <p className="text-[11px] text-[var(--muted)] truncate">{item.sub}</p>
                      )}
                    </div>
                    {active && (
                      <kbd className="shrink-0 rounded border border-[var(--border-2)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]">
                        ↵
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] px-4 py-2 flex items-center gap-4 text-[10px] text-[var(--muted-2)]">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> select</span>
          <span><kbd className="font-mono">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
