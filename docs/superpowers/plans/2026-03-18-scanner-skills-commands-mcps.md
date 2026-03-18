# Scanner Skills, Commands & OAuth MCP Support — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the command-center dashboard to correctly discover skills from `~/.claude/skills/`, display commands from `~/.claude/commands/` as a separate section, and show OAuth-connected MCPs read from a manually-maintained markdown file.

**Architecture:** Three-part change: (1) update `scanner.ts` to scan the correct directories and parse a new `connected-mcps.md` file, (2) update the mutation functions so delete actions target the correct paths, (3) update the two UI components to display the new data. No new API routes are needed — the existing `/api/scan` and `/api/mutate` routes are extended in place.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, lucide-react icons. No test framework is installed — verification is done via `npm run build` (TypeScript compile check) and manual browser inspection.

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `~/.claude/connected-mcps.md` | **Create** | Static list of OAuth-connected MCPs |
| `app/src/lib/scanner.ts` | **Modify** | New types, new scan paths, fixed mutations |
| `app/src/app/api/mutate/route.ts` | **Modify** | Add `removeCommand` action |
| `app/src/components/global-overview.tsx` | **Modify** | 6-card grid, new Commands card |
| `app/src/components/augmentation-panel.tsx` | **Modify** | OAuth badge on MCPs, new Commands accordion |

---

## Task 1: Create `connected-mcps.md`

**Files:**
- Create: `C:/Users/decja/.claude/connected-mcps.md`

- [ ] **Step 1: Create the file**

Create `C:/Users/decja/.claude/connected-mcps.md` with this exact content:

```markdown
# Connected OAuth MCPs

- Gmail (claude.ai)
- Apollo.io (claude.ai)
- Google Calendar (claude.ai)
- Notion (claude.ai)
- Vibe Prospecting (claude.ai)
```

- [ ] **Step 2: Verify file exists**

```bash
cat "C:/Users/decja/.claude/connected-mcps.md"
```

Expected: file contents printed with 5 bullet items.

---

## Task 2: Update scanner types

**Files:**
- Modify: `app/src/lib/scanner.ts:29-97` (the Types block)

The existing types block needs three changes:
1. `MCPServer.source` gains `"oauth"` and a new optional `oauthProvider` field
2. New `CommandInfo` interface added
3. `GlobalConfig` gains `commands: CommandInfo[]`
4. `ScanResult` gains `allCommands: CommandInfo[]`

- [ ] **Step 1: Update `MCPServer` interface**

In `scanner.ts`, find the `MCPServer` interface (line 29) and replace:

```typescript
export interface MCPServer {
  name: string;
  project: string;
  source: "mcp.json" | "permissions";
  tools: string[];
  url?: string;
  hasAuth?: boolean;
  command?: string;
  args?: string[];
}
```

With:

```typescript
export interface MCPServer {
  name: string;
  project: string;
  source: "mcp.json" | "permissions" | "oauth";
  tools: string[];
  url?: string;
  hasAuth?: boolean;
  command?: string;
  args?: string[];
  oauthProvider?: string;
}
```

- [ ] **Step 2: Add `CommandInfo` interface**

After the `SkillInfo` interface (around line 60), add:

```typescript
export interface CommandInfo {
  name: string;
  namespace: string;
  scope: "global" | "project";
  project?: string;
}
```

- [ ] **Step 3: Update `GlobalConfig` to include commands**

Find `GlobalConfig` (around line 81) and add `commands: CommandInfo[]`:

```typescript
export interface GlobalConfig {
  model: string;
  plugins: PluginInfo[];
  agents: AgentInfo[];
  skills: SkillInfo[];
  commands: CommandInfo[];
  hooks: Record<string, string[]>;
}
```

- [ ] **Step 4: Update `ScanResult` to include allCommands**

Find `ScanResult` (around line 89) and add `allCommands: CommandInfo[]`:

```typescript
export interface ScanResult {
  timestamp: string;
  global: GlobalConfig;
  projects: ProjectInfo[];
  allMCPs: MCPServer[];
  allSkills: SkillInfo[];
  allCommands: CommandInfo[];
  allAgents: AgentInfo[];
  allPlugins: PluginInfo[];
}
```

- [ ] **Step 5: Build to verify types compile**

```bash
cd "C:/Users/decja/.claude/command-center/app" && npm run build 2>&1 | tail -20
```

Expected: TypeScript errors about `commands` not being returned yet — that's fine, will be fixed in Task 3.

---

## Task 3: Update `scanGlobalConfig()` — new scan paths

**Files:**
- Modify: `app/src/lib/scanner.ts:175-233` (the `scanGlobalConfig` function)

This function currently scans `~/.claude/commands/<ns>/*.md` for skills. We repurpose that scan for commands, add a new skills scan for `~/.claude/skills/`, and add an OAuth MCP scan.

- [ ] **Step 1: Repurpose the existing commands scan to populate `commands[]`**

Find this block inside `scanGlobalConfig` (around line 219):

```typescript
  // Skills
  const skills: SkillInfo[] = [];
  const cmdsDir = join(CLAUDE_HOME, "commands");
  if (existsSync(cmdsDir)) {
    for (const ns of readdirSync(cmdsDir)) {
      const nsPath = join(cmdsDir, ns);
      if (statSync(nsPath).isDirectory()) {
        for (const f of readdirSync(nsPath).filter(f => f.endsWith(".md")).sort()) {
          skills.push({ name: f.replace(".md", ""), namespace: ns, scope: "global" });
        }
      }
    }
  }
```

Replace it with:

```typescript
  // Commands (from ~/.claude/commands/)
  const commands: CommandInfo[] = [];
  const cmdsDir = join(CLAUDE_HOME, "commands");
  if (existsSync(cmdsDir)) {
    for (const entry of readdirSync(cmdsDir).sort()) {
      const entryPath = join(cmdsDir, entry);
      if (statSync(entryPath).isDirectory()) {
        // Namespaced subdirectory
        for (const f of readdirSync(entryPath).filter(f => f.endsWith(".md")).sort()) {
          commands.push({ name: f.replace(".md", ""), namespace: entry, scope: "global" });
        }
      } else if (entry.endsWith(".md")) {
        // Root-level command file
        commands.push({ name: entry.replace(".md", ""), namespace: "root", scope: "global" });
      }
    }
  }

  // Skills (from ~/.claude/skills/)
  const skills: SkillInfo[] = [];
  const skillsDir = join(CLAUDE_HOME, "skills");
  if (existsSync(skillsDir)) {
    for (const ns of readdirSync(skillsDir)) {
      const nsPath = join(skillsDir, ns);
      if (statSync(nsPath).isDirectory()) {
        for (const f of readdirSync(nsPath).filter(f => f.endsWith(".md")).sort()) {
          skills.push({ name: f.replace(".md", ""), namespace: ns, scope: "global" });
        }
      }
    }
  }
```

- [ ] **Step 2: Add OAuth MCP scan**

After the skills scan block (still inside `scanGlobalConfig`), add the OAuth MCP scan before the `return` statement:

```typescript
  // OAuth MCPs (from ~/.claude/connected-mcps.md)
  const oauthMCPs: MCPServer[] = [];
  const connectedMcpsPath = join(CLAUDE_HOME, "connected-mcps.md");
  if (existsSync(connectedMcpsPath)) {
    try {
      const lines = readFileSync(connectedMcpsPath, "utf-8").split("\n");
      for (const line of lines) {
        const match = line.match(/^-\s+(.+)/);
        if (!match) continue;
        const raw = match[1].trim();
        const parenIdx = raw.indexOf(" (");
        const name = parenIdx >= 0 ? raw.slice(0, parenIdx).trim() : raw;
        const provider = parenIdx >= 0 ? raw.slice(parenIdx + 2, raw.lastIndexOf(")")).trim() : "claude.ai";
        if (name) {
          oauthMCPs.push({ name, project: "global", source: "oauth", tools: [], oauthProvider: provider });
        }
      }
    } catch { /* skip malformed file */ }
  }
```

- [ ] **Step 3: Add `oauthMCPs` to the `GlobalConfig` interface**

`scanGlobalConfig` returns a `GlobalConfig`, so `oauthMCPs` must be declared on it. Find the `GlobalConfig` interface (already updated in Task 2, Step 3) and add the field:

```typescript
export interface GlobalConfig {
  model: string;
  plugins: PluginInfo[];
  agents: AgentInfo[];
  skills: SkillInfo[];
  commands: CommandInfo[];
  hooks: Record<string, string[]>;
  oauthMCPs: MCPServer[];
}
```

- [ ] **Step 4: Update the `return` statement of `scanGlobalConfig`**

Find:

```typescript
  return { model, plugins, agents, skills, hooks };
```

Replace with:

```typescript
  return { model, plugins, agents, skills, commands, hooks, oauthMCPs };
```

- [ ] **Step 5: Update `scan()` to assemble `allCommands` and merge OAuth MCPs**

Find the `scan()` function (around line 470). Update the assembly block:

Find:
```typescript
  const allMCPs: MCPServer[] = [];
  const allSkills: SkillInfo[] = [...global.skills];
  const allAgents: AgentInfo[] = [...global.agents];
```

Replace with:
```typescript
  const allMCPs: MCPServer[] = [...global.oauthMCPs];
  const allSkills: SkillInfo[] = [...global.skills];
  const allCommands: CommandInfo[] = [...global.commands];
  const allAgents: AgentInfo[] = [...global.agents];
```

Then find the `return` at the end of `scan()`:

```typescript
  return {
    timestamp: new Date().toISOString(),
    global,
    projects,
    allMCPs,
    allSkills,
    allAgents,
    allPlugins: global.plugins,
  };
```

Replace with:

```typescript
  return {
    timestamp: new Date().toISOString(),
    global,
    projects,
    allMCPs,
    allSkills,
    allCommands,
    allAgents,
    allPlugins: global.plugins,
  };
```

- [ ] **Step 6: Build to verify**

```bash
cd "C:/Users/decja/.claude/command-center/app" && npm run build 2>&1 | tail -20
```

Expected: Errors in `global-overview.tsx` and `augmentation-panel.tsx` about missing properties — that's expected since we haven't updated the UI yet. `scanner.ts` itself should have no errors.

---

## Task 4: Update mutation functions

**Files:**
- Modify: `app/src/lib/scanner.ts:581-589` (the `removeGlobalSkill` function)
- Modify: `app/src/app/api/mutate/route.ts`

The `removeGlobalSkill` function currently deletes from `~/.claude/commands/` — after Task 3, skills live in `~/.claude/skills/`. We fix this and add a `removeGlobalCommand` function.

- [ ] **Step 1: Fix `removeGlobalSkill` to use the skills path**

Find `removeGlobalSkill` at the bottom of `scanner.ts`:

```typescript
export function removeGlobalSkill(namespace: string, skillName: string): boolean {
  const skillPath = join(CLAUDE_HOME, "commands", namespace, `${skillName}.md`);
  if (existsSync(skillPath)) {
    const { unlinkSync } = require("fs");
    unlinkSync(skillPath);
    return true;
  }
  return false;
}
```

Replace with:

```typescript
export function removeGlobalSkill(namespace: string, skillName: string): boolean {
  const skillPath = join(CLAUDE_HOME, "skills", namespace, `${skillName}.md`);
  if (existsSync(skillPath)) {
    const { unlinkSync } = require("fs");
    unlinkSync(skillPath);
    return true;
  }
  return false;
}

export function removeGlobalCommand(namespace: string, commandName: string): boolean {
  const commandPath = namespace === "root"
    ? join(CLAUDE_HOME, "commands", `${commandName}.md`)
    : join(CLAUDE_HOME, "commands", namespace, `${commandName}.md`);
  if (existsSync(commandPath)) {
    const { unlinkSync } = require("fs");
    unlinkSync(commandPath);
    return true;
  }
  return false;
}
```

- [ ] **Step 2: Add `removeCommand` action to the mutate route**

Open `app/src/app/api/mutate/route.ts`.

Add `removeGlobalCommand` to the import line:

```typescript
import {
  togglePlugin,
  removeMCPFromProject,
  removeGlobalAgent,
  removeGlobalSkill,
  removeGlobalCommand,
} from "@/lib/scanner";
```

Add a new case to the switch statement, after the `removeSkill` case:

```typescript
      case "removeCommand": {
        const { namespace, commandName } = body;
        const removed = removeGlobalCommand(namespace, commandName);
        if (removed) logActivity("remove-command", `${namespace}/${commandName}`);
        return NextResponse.json({ ok: removed, action, namespace, commandName });
      }
```

- [ ] **Step 3: Build to verify**

```bash
cd "C:/Users/decja/.claude/command-center/app" && npm run build 2>&1 | tail -20
```

Expected: No errors in `scanner.ts` or `mutate/route.ts`. UI component errors may still show.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/decja/.claude/command-center" && git add app/src/lib/scanner.ts app/src/app/api/mutate/route.ts && git commit -m "feat: update scanner for skills/, commands/, and OAuth MCPs"
```

---

## Task 5: Update `global-overview.tsx`

**Files:**
- Modify: `app/src/components/global-overview.tsx`

Two changes: fix the grid breakpoints for 6 cards, add the Commands stat card.

- [ ] **Step 1: Add `Terminal` to the lucide-react import**

Find:

```typescript
import { Server, Plug, Bot, Wrench, Cpu } from "lucide-react";
```

Replace with:

```typescript
import { Server, Plug, Bot, Wrench, Cpu, Terminal } from "lucide-react";
```

- [ ] **Step 2: Update the destructure in `GlobalOverview` to include commands**

Find:

```typescript
  const { global, projects, allMCPs } = data;
```

Replace with:

```typescript
  const { global, projects, allMCPs, allCommands } = data;
```

- [ ] **Step 3: Fix the grid classes for 6 cards**

Find:

```typescript
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
```

Replace with:

```typescript
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
```

- [ ] **Step 4: Add the Commands stat card**

After the closing `/>` of the Agents `StatCard` (the last card, around line 103), add:

```tsx
        <StatCard
          icon={Terminal}
          label="Commands"
          value={allCommands.length}
          sub={`${global.commands.length} global`}
          accentClass="bg-teal-500"
          iconBgClass="bg-teal-500/15 text-teal-400"
        />
```

- [ ] **Step 5: Build to verify**

```bash
cd "C:/Users/decja/.claude/command-center/app" && npm run build 2>&1 | tail -20
```

Expected: `global-overview.tsx` errors gone. Only `augmentation-panel.tsx` errors should remain.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/decja/.claude/command-center" && git add app/src/components/global-overview.tsx && git commit -m "feat: add Commands stat card to overview, fix 6-col grid"
```

---

## Task 6: Update `augmentation-panel.tsx` — OAuth MCP badge

**Files:**
- Modify: `app/src/components/augmentation-panel.tsx:88-109` (the `mcpsByName` grouping map and MCP row renderer)

- [ ] **Step 1: Update the `mcpsByName` map to carry `source`**

Find this block (around line 88):

```typescript
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
```

Replace with:

```typescript
  const mcpsByName = new Map<string, { projects: string[]; tools: string[]; url?: string; command?: string; args?: string[]; source: "oauth" | "local"; oauthProvider?: string }>();
  for (const mcp of data.allMCPs) {
    const existing = mcpsByName.get(mcp.name);
    if (existing) {
      if (mcp.source !== "oauth" && !existing.projects.includes(mcp.project)) existing.projects.push(mcp.project);
      existing.tools = [...new Set([...existing.tools, ...mcp.tools])];
    } else {
      mcpsByName.set(mcp.name, {
        projects: mcp.source === "oauth" ? [] : [mcp.project],
        tools: [...mcp.tools],
        url: mcp.url,
        command: mcp.command,
        args: mcp.args,
        source: mcp.source === "oauth" ? "oauth" : "local",
        oauthProvider: mcp.oauthProvider,
      });
    }
  }
```

- [ ] **Step 2: Update the MCP row renderer to show OAuth badge**

Find the MCP row render block inside `filteredMCPs.map(...)` (around line 184). The inner `<div>` that renders name, category badge, and health has this structure:

```tsx
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
```

Replace with:

```tsx
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-[var(--foreground)]">{name}</span>
                          {info.source === "oauth" ? (
                            <span className="rounded-full border border-violet-500/20 bg-violet-500/15 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-violet-400">
                              OAuth · {info.oauthProvider ?? "claude.ai"}
                            </span>
                          ) : (
                            <>
                              {category && (
                                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide capitalize ${CATEGORY_COLORS[category]}`}>
                                  {category}
                                </span>
                              )}
                              <HealthBadge status={healthStatus} />
                            </>
                          )}
                        </div>
                        {info.source === "local" && (
                          <div className="mt-1 flex items-center gap-1.5">
                            {info.projects.map(p => (
                              <span key={p} className="rounded bg-[var(--surface-2)] border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">{p}</span>
                            ))}
                          </div>
                        )}
```

- [ ] **Step 3: Hide delete button for OAuth MCPs**

Find the delete button block (around line 211):

```tsx
                      <div className="ml-3 flex shrink-0 flex-col gap-1">
                        {info.projects.map(project => (
                          <button
```

Wrap it in a conditional so it only renders for local MCPs. Find the closing `</div>` that ends the delete button column (it closes the `flex-col gap-1` div), and wrap the entire block:

```tsx
                      {info.source === "local" && (
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
                      )}
```

- [ ] **Step 4: Build to verify**

```bash
cd "C:/Users/decja/.claude/command-center/app" && npm run build 2>&1 | tail -20
```

Expected: No errors related to MCP rendering.

---

## Task 7: Update `augmentation-panel.tsx` — Commands accordion

**Files:**
- Modify: `app/src/components/augmentation-panel.tsx`

Add a Commands accordion section between Skills and Agents, and add `Terminal` to the imports.

- [ ] **Step 1: Add `Terminal` to the lucide-react import**

Find:

```typescript
import {
  Server, Plug, Bot, Wrench, Trash2,
  ToggleLeft, ToggleRight, ChevronDown, ChevronRight,
  Activity, CheckCircle2, XCircle, HelpCircle, Loader2,
} from "lucide-react";
```

Replace with:

```typescript
import {
  Server, Plug, Bot, Wrench, Trash2, Terminal,
  ToggleLeft, ToggleRight, ChevronDown, ChevronRight,
  Activity, CheckCircle2, XCircle, HelpCircle, Loader2,
} from "lucide-react";
```

- [ ] **Step 2: Add the Commands accordion**

Find the comment `{/* ── Agents ───────────────────────────────────────────── */}` (around line 346) and insert the following block immediately before it:

```tsx
        {/* ── Commands ─────────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div
            onClick={() => toggle("commands")}
            className="flex w-full cursor-pointer items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-[var(--surface-2)]/60"
          >
            <div className="flex items-center gap-2.5">
              <Terminal size={15} className="text-teal-400" />
              <span className="text-sm font-medium text-[var(--foreground)]">Commands</span>
              <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-xs text-teal-400">
                {data.allCommands.length}
              </span>
            </div>
            {expanded === "commands" ? <ChevronDown size={15} className="text-[var(--muted)]" /> : <ChevronRight size={15} className="text-[var(--muted)]" />}
          </div>
          {expanded === "commands" && (
            <div className="border-t border-[var(--border)] px-5 py-3">
              {Object.entries(
                data.allCommands.reduce((acc, c) => {
                  const key = c.scope === "global" ? `global / ${c.namespace}` : `${c.project}`;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(c);
                  return acc;
                }, {} as Record<string, typeof data.allCommands>)
              ).map(([group, cmds]) => (
                <div key={group} className="mb-3 last:mb-0">
                  <p className="mb-1.5 text-[11px] font-medium text-[var(--muted)]">
                    {group} <span className="text-[var(--muted-2)]">({cmds.length})</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cmds.map(c => (
                      <span
                        key={`${c.namespace}-${c.name}`}
                        className="rounded border border-teal-500/20 bg-teal-500/8 px-2 py-0.5 text-[10px] text-teal-400/80"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {data.allCommands.length === 0 && (
                <p className="text-sm text-[var(--muted)] italic">No commands installed</p>
              )}
            </div>
          )}
        </div>

```

- [ ] **Step 3: Full build to verify no errors**

```bash
cd "C:/Users/decja/.claude/command-center/app" && npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/decja/.claude/command-center" && git add app/src/components/augmentation-panel.tsx && git commit -m "feat: add Commands accordion and OAuth badge for MCPs in augmentation panel"
```

---

## Task 8: End-to-end verification

- [ ] **Step 1: Start the dev server**

```bash
cd "C:/Users/decja/.claude/command-center/app" && npm run dev
```

Open `http://localhost:3000`.

- [ ] **Step 2: Verify Overview section**

The top stats row should show 6 cards:
- Model, MCP Servers, Plugins, Skills, Agents, **Commands**
- Skills count should be > 0 (your skills from `~/.claude/skills/`)
- Commands count should be 2 (`ingest-skills`, `yt-search` from `~/.claude/commands/`)
- MCP Servers count should be 5 (your 5 OAuth MCPs)

- [ ] **Step 3: Verify Augmentations panel — MCPs**

Open the MCP Servers accordion. You should see:
- 5 entries (Gmail, Apollo.io, Google Calendar, Notion, Vibe Prospecting)
- Each shows a purple `"OAuth · claude.ai"` badge
- No delete button on any of them

- [ ] **Step 4: Verify Augmentations panel — Skills**

Open the Skills accordion. Skills from `~/.claude/skills/` grouped by namespace should appear.

- [ ] **Step 5: Verify Augmentations panel — Commands**

Open the Commands accordion. Should show `ingest-skills` and `yt-search` under `global / root`.

- [ ] **Step 6: Final commit**

```bash
cd "C:/Users/decja/.claude/command-center" && git add "C:/Users/decja/.claude/connected-mcps.md" && git commit -m "chore: add connected-mcps.md with current OAuth integrations"
```

---

## Spec Reference

`docs/superpowers/specs/2026-03-18-scanner-skills-commands-mcps-design.md`
