"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, X, RefreshCw, ToggleLeft, ToggleRight, Server, Bot, Wrench, Download, Play, Trash2 } from "lucide-react";

interface ActivityEntry {
  timestamp: string;
  action: string;
  details: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const actionMeta: Record<string, { icon: typeof Activity; color: string; label: string }> = {
  "toggle-plugin":  { icon: ToggleRight, color: "text-purple-400",  label: "Plugin toggled"  },
  "remove-mcp":     { icon: Server,      color: "text-emerald-400", label: "MCP removed"     },
  "remove-agent":   { icon: Bot,         color: "text-rose-400",    label: "Agent removed"   },
  "remove-skill":   { icon: Wrench,      color: "text-blue-400",    label: "Skill removed"   },
  "install-mcp":    { icon: Download,    color: "text-emerald-400", label: "MCP installed"   },
  "install-skill":  { icon: Download,    color: "text-blue-400",    label: "Skill installed" },
  "install-agent":  { icon: Download,    color: "text-rose-400",    label: "Agent installed" },
  "start-project":  { icon: Play,        color: "text-amber-400",   label: "Project started" },
};

function getActionMeta(action: string) {
  return actionMeta[action] ?? { icon: Activity, color: "text-zinc-400", label: action };
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function ActivityLog({ open, onClose }: Props) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/activity");
      const data = await res.json() as { entries: ActivityEntry[] };
      setEntries(data.entries);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchEntries();
  }, [open, fetchEntries]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-end pt-[72px] pr-4"
      onClick={onClose}
    >
      <div
        className="w-80 overflow-hidden rounded-xl border border-[var(--border-2)] bg-[var(--surface)] shadow-2xl animate-fade-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-rose-400" />
            <span className="text-sm font-medium text-[var(--foreground)]">Activity Log</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchEntries}
              className="rounded p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={onClose}
              className="rounded p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Entries */}
        <div className="max-h-96 overflow-y-auto">
          {entries.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Trash2 size={20} className="mb-2 text-[var(--muted-2)]" />
              <p className="text-xs text-[var(--muted)]">No activity yet</p>
              <p className="mt-0.5 text-[11px] text-[var(--muted-2)]">
                Actions like installing MCPs or toggling plugins will appear here
              </p>
            </div>
          )}

          {entries.map((entry, i) => {
            const meta = getActionMeta(entry.action);
            const Icon = meta.icon;
            return (
              <div
                key={i}
                className="flex items-start gap-3 border-b border-[var(--border)]/50 px-4 py-3 last:border-0"
              >
                <div className={`mt-0.5 shrink-0 ${meta.color}`}>
                  <Icon size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--foreground)]">{meta.label}</p>
                  <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{entry.details}</p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-[var(--muted-2)]">
                  {relativeTime(entry.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
