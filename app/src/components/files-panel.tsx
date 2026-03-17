"use client";

import { useEffect, useState, useCallback } from "react";
import type { MdFile } from "@/lib/files";
import {
  Bot,
  Wrench,
  FileText,
  Map,
  File,
  ChevronRight,
  ChevronDown,
  Globe,
  FolderOpen,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  X,
  Zap,
  LayoutTemplate,
} from "lucide-react";
import { CLAUDE_TEMPLATES, type ClaudeTemplate } from "@/lib/templates";

interface FileTree {
  global: MdFile[];
  projects: Record<string, MdFile[]>;
}

const categoryIcon: Record<MdFile["category"], typeof File> = {
  agent: Bot,
  skill: Wrench,
  "claude-md": FileText,
  plan: Map,
  other: File,
};

const categoryColor: Record<MdFile["category"], string> = {
  agent: "text-rose-400",
  skill: "text-blue-400",
  "claude-md": "text-amber-400",
  plan: "text-purple-400",
  other: "text-zinc-400",
};

const categoryLabel: Record<MdFile["category"], string> = {
  agent: "Agents",
  skill: "Skills",
  "claude-md": "Context Files",
  plan: "Plans",
  other: "Other",
};

function groupByCategory(files: MdFile[]) {
  const groups: Record<string, MdFile[]> = {};
  for (const f of files) {
    const key = f.namespace ? `skill/${f.namespace}` : f.category;
    if (!groups[key]) groups[key] = [];
    groups[key].push(f);
  }
  return groups;
}

// Paths resolved at runtime from /api/config — avoids hardcoding /home/username
let _claudeHome = "~/.claude";
let _projectsDir = "~/Desktop";
fetch("/api/config").then(r => r.json()).then((cfg: { claudeHome: string; projectsDirs: string[] }) => {
  _claudeHome = cfg.claudeHome;
  _projectsDir = cfg.projectsDirs?.[0] ?? _projectsDir;
}).catch(() => {});

function getClaudeHome() { return _claudeHome; }
function getProjectsDir() { return _projectsDir; }

interface NewFileState {
  open: boolean;
  name: string;
  location: string; // "global-agent" | "global-skill-<ns>" | "project-<name>" | "project-<name>-root"
  category: MdFile["category"];
}

export function FilesPanel() {
  const [tree, setTree] = useState<FileTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<MdFile | null>(null);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [fileLoading, setFileLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["global"]));
  const [newFile, setNewFile] = useState<NewFileState>({
    open: false, name: "", location: "global-agent", category: "agent",
  });
  const [creating, setCreating] = useState(false);
  const [templateModal, setTemplateModal] = useState(false);
  const [templateTarget, setTemplateTarget] = useState<string>(""); // project name or "global"
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      setTree(data);
      setExpanded(prev => {
        const next = new Set(prev);
        next.add("global");
        Object.keys(data.projects || {}).forEach((p: string) => next.add(`project-${p}`));
        return next;
      });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  const openFile = useCallback(async (file: MdFile) => {
    setSelectedFile(file);
    setFileLoading(true);
    setSaveStatus("idle");
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(file.path)}`);
      const data = await res.json();
      setContent(data.content || "");
      setOriginalContent(data.content || "");
    } catch {
      setContent("");
      setOriginalContent("");
    } finally {
      setFileLoading(false);
    }
  }, []);

  const saveFile = useCallback(async () => {
    if (!selectedFile) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selectedFile.path, content }),
      });
      if (res.ok) {
        setOriginalContent(content);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
      }
    } catch { setSaveStatus("error"); }
    finally { setSaving(false); }
  }, [selectedFile, content]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s" && selectedFile) {
        e.preventDefault();
        saveFile();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveFile, selectedFile]);

  const createFile = useCallback(async () => {
    if (!newFile.name.trim()) return;
    setCreating(true);
    try {
      const name = newFile.name.trim().replace(/\.md$/, "");
      let path = "";
      if (newFile.location === "global-agent") {
        path = `${getClaudeHome()}/agents/${name}.md`;
      } else if (newFile.location.startsWith("global-skill-")) {
        const ns = newFile.location.replace("global-skill-", "");
        path = `${getClaudeHome()}/commands/${ns}/${name}.md`;
      } else if (newFile.location.startsWith("project-") && newFile.location.endsWith("-root")) {
        const proj = newFile.location.replace("project-", "").replace(/-root$/, "");
        path = `${getProjectsDir()}/${proj}/${name}.md`;
      } else if (newFile.location.startsWith("project-")) {
        const proj = newFile.location.replace("project-", "");
        const subdir = newFile.category === "agent" ? "agents" : "commands";
        path = `${getProjectsDir()}/${proj}/.claude/${subdir}/${name}.md`;
      }

      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content: `# ${name}\n\n` }),
      });
      if (res.ok) {
        setNewFile({ open: false, name: "", location: "global-agent", category: "agent" });
        await fetchTree();
        // Open the new file
        const fakeFile: MdFile = {
          id: path, path, relativePath: path, name, scope: "global",
          category: newFile.category, size: 0, modified: new Date().toISOString(),
        };
        await openFile(fakeFile);
      }
    } finally { setCreating(false); }
  }, [newFile, fetchTree, openFile]);

  const applyTemplate = useCallback(async (template: ClaudeTemplate) => {
    if (!templateTarget) return;
    setApplyingTemplate(true);
    try {
      const path = templateTarget === "global"
        ? `${getClaudeHome()}/CLAUDE.md`
        : `${getProjectsDir()}/${templateTarget}/CLAUDE.md`;
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content: template.content }),
      });
      if (res.ok) {
        setTemplateModal(false);
        await fetchTree();
        // Open the file we just created
        const fakeFile: MdFile = {
          id: path, path, relativePath: path,
          name: "CLAUDE", scope: templateTarget === "global" ? "global" : "project",
          category: "claude-md", project: templateTarget === "global" ? undefined : templateTarget,
          size: template.content.length, modified: new Date().toISOString(),
        };
        await openFile(fakeFile);
      }
    } finally { setApplyingTemplate(false); }
  }, [templateTarget, fetchTree, openFile]);

  const toggleSection = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const isDirty = content !== originalContent;
  const isPrimer = selectedFile?.name === "primer";

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-600">
        <Loader2 size={20} className="animate-spin mr-2" />
        Loading files...
      </div>
    );
  }
  if (!tree) return null;

  const totalFiles =
    tree.global.length + Object.values(tree.projects).reduce((a, b) => a + b.length, 0);

  const projectNames = Object.keys(tree.projects);

  return (
    <>
      <div className="flex h-[calc(100vh-140px)] overflow-hidden rounded-xl border border-zinc-800">
        {/* Sidebar */}
        <div className="w-72 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <p className="text-xs font-medium text-zinc-400">{totalFiles} files</p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setTemplateTarget(projectNames[0] ?? "global"); setTemplateModal(true); }}
                className="flex items-center gap-1 rounded-md border border-[var(--border-2)] bg-[var(--surface-2)] px-2 py-1 text-[11px] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                title="Apply a CLAUDE.md template"
              >
                <LayoutTemplate size={11} />
                Templates
              </button>
              <button
                onClick={() => setNewFile(f => ({ ...f, open: true }))}
                className="flex items-center gap-1 rounded-md bg-zinc-700 px-2 py-1 text-[11px] text-zinc-300 transition-colors hover:bg-zinc-600"
              >
                <Plus size={11} />
                New file
              </button>
            </div>
          </div>

          <div className="py-2">
            {/* Global */}
            <SectionHeader label="Global (~/.claude)" icon={Globe} count={tree.global.length} expanded={expanded.has("global")} onToggle={() => toggleSection("global")} />
            {expanded.has("global") && (
              <CategoryGroup files={tree.global} selected={selectedFile} onSelect={openFile} />
            )}

            {/* Projects */}
            {Object.entries(tree.projects).map(([project, files]) => (
              <div key={project}>
                <SectionHeader label={project} icon={FolderOpen} count={files.length} expanded={expanded.has(`project-${project}`)} onToggle={() => toggleSection(`project-${project}`)} isProject />
                {expanded.has(`project-${project}`) && (
                  <CategoryGroup files={files} selected={selectedFile} onSelect={openFile} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="flex flex-1 flex-col overflow-hidden bg-zinc-950">
          {!selectedFile ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-700">
              <FileText size={40} strokeWidth={1} />
              <p className="text-sm">Select a file to view and edit</p>
              <p className="text-xs text-zinc-800">Ctrl+S / ⌘S saves</p>
            </div>
          ) : (
            <>
              {/* Editor header */}
              <div className={`flex items-center justify-between border-b px-5 py-3 ${isPrimer ? "border-amber-500/30 bg-amber-500/5" : "border-zinc-800 bg-zinc-900/80"}`}>
                <div className="flex items-center gap-2 min-w-0">
                  {isPrimer ? (
                    <Zap size={15} className="text-amber-400 shrink-0" />
                  ) : (
                    (() => {
                      const Icon = categoryIcon[selectedFile.category];
                      return <Icon size={15} className={`${categoryColor[selectedFile.category]} shrink-0`} />;
                    })()
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-200 truncate">{selectedFile.name}.md</p>
                      {isPrimer && (
                        <span className="rounded bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[10px] text-amber-400">
                          session primer
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-600 truncate">{selectedFile.relativePath}</p>
                  </div>
                  {isDirty && <span className="ml-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isDirty && (
                    <button onClick={() => setContent(originalContent)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300">
                      <RotateCcw size={12} /> Revert
                    </button>
                  )}
                  {saveStatus === "saved" && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle2 size={13} /> Saved
                    </span>
                  )}
                  {saveStatus === "error" && (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <AlertCircle size={13} /> Error
                    </span>
                  )}
                  <button onClick={saveFile} disabled={saving || !isDirty}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all ${isDirty ? "bg-amber-600/90 text-black hover:bg-amber-500" : "bg-zinc-800 text-zinc-600"} disabled:opacity-60`}>
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Save
                  </button>
                </div>
              </div>

              {/* Primer tip banner */}
              {isPrimer && (
                <div className="border-b border-amber-500/20 bg-amber-500/5 px-5 py-2 text-[11px] text-amber-400/70">
                  Claude reads this at session start and rewrites it completely at session end.
                </div>
              )}

              {fileLoading ? (
                <div className="flex h-full items-center justify-center text-zinc-700">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="h-full w-full resize-none bg-transparent p-5 font-mono text-sm text-zinc-300 outline-none placeholder-zinc-700 leading-relaxed"
                  placeholder="Empty file"
                  spellCheck={false}
                />
              )}

              <div className="flex items-center gap-4 border-t border-zinc-800/50 bg-zinc-900/60 px-5 py-2 text-[11px] text-zinc-600">
                <span>{categoryLabel[selectedFile.category]}</span>
                <span>{selectedFile.scope}</span>
                {selectedFile.project && <span>{selectedFile.project}</span>}
                {selectedFile.namespace && <span>/{selectedFile.namespace}</span>}
                <span className="ml-auto">{content.split("\n").length} lines &middot; {content.length} chars</span>
                <span className="text-zinc-700">Ctrl+S / ⌘S</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Templates Modal */}
      {templateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[520px] max-h-[80vh] flex flex-col rounded-xl border border-[var(--border-2)] bg-[var(--surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">CLAUDE.md Templates</h3>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">Writes a CLAUDE.md to the selected location</p>
              </div>
              <button onClick={() => setTemplateModal(false)} className="rounded p-1 text-[var(--muted)] hover:text-[var(--foreground)]">
                <X size={16} />
              </button>
            </div>

            {/* Target picker */}
            <div className="border-b border-[var(--border)] px-5 py-3">
              <label className="mb-1.5 block text-[11px] text-[var(--muted)]">Apply to</label>
              <select
                value={templateTarget}
                onChange={e => setTemplateTarget(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-2)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] outline-none"
              >
                <option value="global">Global (~/.claude/CLAUDE.md)</option>
                {projectNames.map(p => (
                  <option key={p} value={p}>{p} (project root)</option>
                ))}
              </select>
            </div>

            {/* Template list */}
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {CLAUDE_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  disabled={applyingTemplate}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 p-3.5 text-left transition-all hover:border-amber-500/40 hover:bg-amber-500/5 disabled:opacity-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--foreground)]">{t.name}</span>
                        <span className="rounded border border-[var(--border-2)] bg-[var(--surface)] px-1.5 py-0.5 text-[9px] text-[var(--muted)] uppercase tracking-wide">{t.category}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--muted)]">{t.description}</p>
                    </div>
                    {applyingTemplate
                      ? <Loader2 size={14} className="animate-spin text-[var(--muted)] shrink-0" />
                      : <span className="shrink-0 text-[11px] text-amber-400 opacity-0 group-hover:opacity-100">Apply →</span>
                    }
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New File Modal */}
      {newFile.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[420px] rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200">New Markdown File</h3>
              <button onClick={() => setNewFile(f => ({ ...f, open: false }))}
                className="rounded p-1 text-zinc-500 hover:text-zinc-300">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs text-zinc-500">Filename</label>
                <input
                  autoFocus
                  type="text"
                  value={newFile.name}
                  onChange={e => setNewFile(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && createFile()}
                  placeholder="e.g. my-agent or primer"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500 placeholder-zinc-600"
                />
                <p className="mt-1 text-[10px] text-zinc-600">.md extension added automatically</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-zinc-500">Location</label>
                <select
                  value={newFile.location}
                  onChange={e => setNewFile(f => ({ ...f, location: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 outline-none focus:border-zinc-500"
                >
                  <optgroup label="Global">
                    <option value="global-agent">~/.claude/agents/ (agent)</option>
                    <option value="global-skill-gsd">~/.claude/commands/gsd/ (skill)</option>
                  </optgroup>
                  <optgroup label="Project roots (CLAUDE.md, primer.md, etc.)">
                    {projectNames.map(p => (
                      <option key={`${p}-root`} value={`project-${p}-root`}>
                        ~/Desktop/{p}/ (root file)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Project .claude/ (agent or skill)">
                    {projectNames.map(p => (
                      <option key={p} value={`project-${p}`}>
                        ~/Desktop/{p}/.claude/
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {newFile.location.startsWith("project-") && !newFile.location.endsWith("-root") && (
                <div>
                  <label className="mb-1.5 block text-xs text-zinc-500">Category</label>
                  <div className="flex gap-2">
                    {(["agent", "skill"] as const).map(cat => (
                      <button key={cat} onClick={() => setNewFile(f => ({ ...f, category: cat }))}
                        className={`flex-1 rounded-lg border py-2 text-xs transition-colors ${newFile.category === cat ? "border-zinc-500 bg-zinc-700 text-zinc-200" : "border-zinc-700 text-zinc-500 hover:text-zinc-400"}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button onClick={() => setNewFile(f => ({ ...f, open: false }))}
                className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800">
                Cancel
              </button>
              <button onClick={createFile} disabled={creating || !newFile.name.trim()}
                className="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-500 disabled:opacity-50">
                {creating ? <Loader2 size={14} className="mx-auto animate-spin" /> : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SectionHeader({ label, icon: Icon, count, expanded, onToggle, isProject }: {
  label: string; icon: typeof Globe; count: number;
  expanded: boolean; onToggle: () => void; isProject?: boolean;
}) {
  return (
    <button onClick={onToggle}
      className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-zinc-800/40">
      {expanded ? <ChevronDown size={13} className="text-zinc-600" /> : <ChevronRight size={13} className="text-zinc-600" />}
      <Icon size={13} className={isProject ? "text-blue-400/70" : "text-amber-400/70"} />
      <span className="flex-1 truncate text-xs font-medium text-zinc-400">{label}</span>
      <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600">{count}</span>
    </button>
  );
}

function CategoryGroup({ files, selected, onSelect }: {
  files: MdFile[]; selected: MdFile | null; onSelect: (f: MdFile) => void;
}) {
  const groups = groupByCategory(files);

  return (
    <div className="mb-1">
      {Object.entries(groups).map(([group, groupFiles]) => {
        const category = groupFiles[0].category;
        const Icon = categoryIcon[category];
        const color = categoryColor[category];
        const label = group.startsWith("skill/")
          ? `skills / ${group.split("/")[1]}`
          : categoryLabel[category];

        return (
          <div key={group} className="mb-1">
            <div className="flex items-center gap-1.5 px-4 py-1">
              <Icon size={11} className={`${color} opacity-60`} />
              <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">{label}</span>
            </div>
            {groupFiles.map((file) => {
              const isPrimer = file.name === "primer";
              return (
                <button key={file.id} onClick={() => onSelect(file)}
                  className={`flex w-full items-center gap-2 px-6 py-1.5 text-left text-xs transition-colors ${
                    selected?.id === file.id
                      ? isPrimer ? "bg-amber-500/15 text-amber-300" : "bg-zinc-700/60 text-zinc-200"
                      : isPrimer ? "text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-300" : "text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300"
                  }`}>
                  {isPrimer && <Zap size={10} className="shrink-0 text-amber-400" />}
                  <span className="truncate">{file.name}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-zinc-700">
                    {Math.round((file.size / 1024) * 10) / 10 || "<1"}k
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
