# Design: Scanner Skills, Commands & OAuth MCP Support

**Date:** 2026-03-18
**Status:** Approved
**Scope:** `command-center` app — `scanner.ts`, `augmentation-panel.tsx`, `global-overview.tsx`

---

## Problem

The command-center dashboard shows 0 skills and 0 MCPs despite both being installed, because:

1. The scanner reads skills from `~/.claude/commands/<ns>/*.md` but the user's skills live in `~/.claude/skills/<ns>/*.md`.
2. Files at the root of `~/.claude/commands/` (not in subdirectories) are silently ignored.
3. MCPs are cloud-based OAuth integrations (Gmail, Apollo, Google Calendar, Notion, Vibe Prospecting) with no local config file — the scanner only reads per-project `.mcp.json` and `settings.local.json`.

---

## Goals

- Skills from `~/.claude/skills/` appear in the dashboard.
- Files in `~/.claude/commands/` appear as a separate **Commands** section (distinct from Skills).
- OAuth-connected MCPs are visible in the MCP panel with an "OAuth" badge.
- Locally-configured MCPs (per-project `.mcp.json`) continue to work as-is.
- Spacing remains correct across all viewport sizes.

---

## Architecture

### New file: `~/.claude/connected-mcps.md`

A manually-maintained markdown list seeded at setup time. The scanner reads this at startup.

```markdown
# Connected OAuth MCPs

- Gmail (claude.ai)
- Apollo.io (claude.ai)
- Google Calendar (claude.ai)
- Notion (claude.ai)
- Vibe Prospecting (claude.ai)
```

Parser: extract lines matching `^- (.+)`. If the line contains ` (`, use the text before it as the MCP name and the text inside the parentheses as `oauthProvider`. If no parenthetical is present, use the full line text as the name and default `oauthProvider` to `"claude.ai"`.

---

## Data Model Changes (`scanner.ts`)

### New type: `CommandInfo`

```typescript
export interface CommandInfo {
  name: string;
  namespace: string;   // subdirectory name, or "root" for top-level files
  scope: "global" | "project";
  project?: string;
}
```

### Updated type: `MCPServer`

Add `source` value and optional field:

```typescript
source: "mcp.json" | "permissions" | "oauth";
oauthProvider?: string; // e.g. "claude.ai"
```

### Updated type: `GlobalConfig`

Add `commands: CommandInfo[]`.

### Updated type: `ScanResult`

Add `allCommands: CommandInfo[]`.

---

## Scanner Changes (`scanGlobalConfig`)

### Skills scan (new path)

In addition to the existing `commands/` scan, add:

```
~/.claude/skills/<namespace>/*.md  →  SkillInfo[]  (source: "skills")
```

Scan logic mirrors the existing `commands/` subdirectory scan.

### Commands scan (renamed from existing skills scan)

The existing scan of `~/.claude/commands/<ns>/*.md` is repurposed to populate `commands: CommandInfo[]` instead of `skills`. Root-level `.md` files in `commands/` (not in subdirectories) are also included, with `namespace: "root"`.

### `scan()` assembly block update

The top-level `scan()` function must be updated to initialize and return `allCommands`:

```typescript
const allCommands: CommandInfo[] = [...global.commands];
// (no project-level aggregation — per-project commands are out of scope)
```

`allCommands` is returned in `ScanResult` alongside the existing `all*` arrays.

### OAuth MCP scan (new)

Read `~/.claude/connected-mcps.md` if it exists. Parse bullet list items. For each:

```typescript
{
  name: "<parsed name>",
  project: "global",
  source: "oauth",
  tools: [],
  oauthProvider: "claude.ai",
}
```

Push into `allMCPs`.

---

## UI Changes

### `global-overview.tsx`

- Grid changes from `lg:grid-cols-5` to `sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6`.
- New **Commands** stat card (6th card):
  - Icon: `Terminal` (lucide-react)
  - Color: teal (`bg-teal-500`, `text-teal-400`)
  - Value: `data.allCommands.length` (read from `data` prop directly, same pattern as `data.allSkills`)
  - Sub: template literal `` `${global.commands.length} global` `` (no surrounding quotes)

### `augmentation-panel.tsx`

**MCP section:**
- The `mcpsByName` grouping map must carry `source` through (add `source: "oauth" | "local"` to the map value, where `"local"` covers both `"mcp.json"` and `"permissions"` sources).
- OAuth MCPs display with a purple `"OAuth"` badge instead of a project pill. This requires branching on `source` in the row renderer.
- No delete button for OAuth MCPs.
- Health check skips OAuth entries (they are always-on).

**New Commands accordion** (between Skills and Agents):
- Icon: `Terminal`, color: teal
- Groups by namespace, same layout as Skills section.
- Pill color: `border-teal-500/20 bg-teal-500/8 text-teal-400/80`.

**Skills section:**
- No visual change. Correctly populated from `~/.claude/skills/` after scanner fix.

---

## Mutation Changes

The existing `removeGlobalSkill` function reads from `~/.claude/commands/<namespace>/` — after this refactor that path holds commands, not skills. This function must be updated:

- `removeGlobalSkill(namespace, skillName)` → deletes from `~/.claude/skills/<namespace>/`
- New `removeGlobalCommand(namespace, commandName)` → deletes from `~/.claude/commands/<namespace>/`

The API mutation route (`/api/mutate`) must handle a new `action: "removeCommand"` alongside the existing `action: "removeSkill"`.

OAuth MCPs have no delete mutation — the delete button is hidden for them in the UI.

---

## Error Handling

- Missing `~/.claude/skills/` → silently skip (same pattern as existing `agents/` scan).
- Missing `connected-mcps.md` → skip OAuth MCP scan, show 0 OAuth MCPs.
- Malformed `connected-mcps.md` → skip unparseable lines, process valid ones.
- All new scans wrapped in `existsSync` guards matching existing patterns.

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/scanner.ts` | Add skills scan, repurpose commands scan, add OAuth MCP scan, add `CommandInfo` type, update `GlobalConfig`/`ScanResult`, split `removeGlobalSkill` → skills path, add `removeGlobalCommand` → commands path |
| `src/components/global-overview.tsx` | Add Commands card, fix grid breakpoints |
| `src/components/augmentation-panel.tsx` | OAuth badge on MCPs, new Commands accordion |
| `~/.claude/connected-mcps.md` | New file (created as part of implementation) |

---

## Out of Scope

- Auto-discovery of OAuth MCPs from Claude.ai API (requires auth token plumbing).
- Per-project commands scanning.
- Editing skills/commands from the UI.
