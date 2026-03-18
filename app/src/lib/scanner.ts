import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from "fs";
import { join, basename } from "path";
import { execSync } from "child_process";
import { CLAUDE_HOME, PROJECTS_DIRS } from "./config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readJSON(path: string): Record<string, any> {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {};
  }
}

function writeJSON(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

function readText(path: string, maxLines = 50): string {
  try {
    return readFileSync(path, "utf-8").split("\n").slice(0, maxLines).join("\n");
  } catch {
    return "";
  }
}

// ── Types ──────────────────────────────────────────────────────────────

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

export interface PluginInfo {
  name: string;
  shortName: string;
  installedAt: string;
  lastUpdated: string;
  enabled: boolean;
  scope: "global";
}

export interface AgentInfo {
  name: string;
  scope: "global" | "project";
  project?: string;
}

export interface SkillInfo {
  name: string;
  namespace: string;
  scope: "global" | "project";
  project?: string;
}

export interface CommandInfo {
  name: string;
  namespace: string;
  scope: "global" | "project";
  project?: string;
}

export interface ProjectStatus {
  percent: number;
  nextSteps: string[];
  source: "checkboxes" | "primer" | "none";
}

export interface ProjectInfo {
  name: string;
  path: string;
  type: string;
  summary: string;
  mcpServers: MCPServer[];
  skills: SkillInfo[];
  agents: AgentInfo[];
  permissionCount: number;
  techStack: string[];
  status: ProjectStatus;
}

export interface GlobalConfig {
  model: string;
  plugins: PluginInfo[];
  agents: AgentInfo[];
  skills: SkillInfo[];
  commands: CommandInfo[];
  hooks: Record<string, string[]>;
  oauthMCPs: MCPServer[];
}

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

// ── Project Summary ────────────────────────────────────────────────────

/** Extract the first meaningful paragraph from markdown, skipping boilerplate */
function extractMdSummary(text: string): string | null {
  const boilerplate = [
    "this is a [next.js]", "getting started", "first, run the",
    "yarn dev", "pnpm dev", "npm run dev", "bun dev", "```",
    "open [http://localhost", "you can start editing", "learn more", "deploy on vercel",
  ];
  const lines = text.split("\n");
  const contentLines: string[] = [];

  // Collect all non-heading, non-empty lines
  for (const line of lines) {
    if (line.startsWith("#")) continue;
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (boilerplate.some(b => trimmed.toLowerCase().includes(b))) continue;
    if (trimmed.startsWith("(") && trimmed.endsWith(")")) continue; // skip "(None yet)" etc
    if (trimmed.startsWith("-") || trimmed.startsWith("*")) continue; // skip list items for summary
    contentLines.push(trimmed);
    if (contentLines.join(" ").length > 200) break;
  }

  const result = contentLines.join(" ").slice(0, 300);
  return result.length > 20 ? result : null;
}

function buildProjectSummary(dir: string, name: string): string {
  // Try PROJECT.md first (best source)
  const projectMd = join(dir, ".planning", "PROJECT.md");
  if (existsSync(projectMd)) {
    const text = readText(projectMd, 30);
    const extracted = extractMdSummary(text);
    if (extracted) return extracted;
  }

  // Try README.md
  const readme = join(dir, "README.md");
  if (existsSync(readme)) {
    const text = readText(readme, 20);
    const extracted = extractMdSummary(text);
    if (extracted) return extracted;
  }

  // Try plan.md — extract first heading or non-checkbox line as a short status
  const planMd = join(dir, "plan.md");
  if (existsSync(planMd)) {
    const text = readText(planMd, 10);
    const lines = text.split("\n");
    for (const line of lines) {
      const trimmed = line.replace(/^#+\s*/, "").trim();
      if (trimmed && !trimmed.startsWith("- [") && trimmed.length > 10) {
        return trimmed.slice(0, 200);
      }
    }
  }

  // Try CLAUDE.md
  const claudeMd = join(dir, "CLAUDE.md");
  if (existsSync(claudeMd)) {
    const text = readText(claudeMd, 10);
    const lines = text.split("\n").filter(l => l.trim() && !l.startsWith("#"));
    if (lines.length > 0) return lines.slice(0, 3).join(" ").slice(0, 300);
  }

  // Try package.json description or name
  const pkg = readJSON(join(dir, "package.json"));
  if (pkg.description) return String(pkg.description);
  if (pkg.name && pkg.name !== name) return `${pkg.name} — ${name} project`;

  return `${name} project`;
}

// ── Scanning ───────────────────────────────────────────────────────────

function scanGlobalConfig(): GlobalConfig {
  const settings = readJSON(join(CLAUDE_HOME, "settings.json"));
  const pluginsData = readJSON(join(CLAUDE_HOME, "plugins", "installed_plugins.json"));

  const model = (settings.model as string) || "(not set)";

  // Hooks
  const hooks: Record<string, string[]> = {};
  const rawHooks = (settings.hooks || {}) as Record<string, { hooks: { command: string }[] }[]>;
  for (const [event, entries] of Object.entries(rawHooks)) {
    hooks[event] = [];
    for (const entry of entries) {
      for (const h of entry.hooks || []) {
        hooks[event].push(h.command);
      }
    }
  }

  // Plugins
  const enabledPlugins = (settings.enabledPlugins || {}) as Record<string, boolean>;
  const plugins: PluginInfo[] = [];
  const rawPlugins = (pluginsData.plugins || {}) as Record<string, { installedAt: string; lastUpdated: string }[]>;
  for (const [name, versions] of Object.entries(rawPlugins)) {
    const v = versions[0] || {};
    plugins.push({
      name,
      shortName: name.split("@")[0],
      installedAt: v.installedAt || "?",
      lastUpdated: v.lastUpdated || "?",
      enabled: enabledPlugins[name] ?? false,
      scope: "global",
    });
  }

  // Agents
  const agents: AgentInfo[] = [];
  const agentsDir = join(CLAUDE_HOME, "agents");
  if (existsSync(agentsDir)) {
    for (const f of readdirSync(agentsDir).filter(f => f.endsWith(".md")).sort()) {
      agents.push({ name: f.replace(".md", ""), scope: "global" });
    }
  }

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
    for (const ns of readdirSync(skillsDir).sort()) {
      const nsPath = join(skillsDir, ns);
      if (statSync(nsPath).isDirectory()) {
        for (const f of readdirSync(nsPath).filter(f => f.endsWith(".md")).sort()) {
          skills.push({ name: f.replace(".md", ""), namespace: ns, scope: "global" });
        }
      }
    }
  }

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

  return { model, plugins, agents, skills, commands, hooks, oauthMCPs };
}

function detectProjectType(dir: string): string {
  if (existsSync(join(dir, "Cargo.toml"))) return "rust";
  if (existsSync(join(dir, "go.mod"))) return "go";
  if (existsSync(join(dir, "pyproject.toml"))) return "python";
  if (existsSync(join(dir, "requirements.txt"))) return "python";
  if (existsSync(join(dir, "package.json"))) return "node";
  return "unknown";
}

function getKeyTech(dir: string): string[] {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) return [];
  const pkg = readJSON(pkgPath);
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const keyDeps = [
    "next", "react", "vue", "angular", "express", "prisma", "tailwindcss",
    "typescript", "remotion", "supabase", "@supabase/supabase-js", "stripe",
    "framer-motion", "recharts", "@anthropic-ai/sdk",
  ];
  return keyDeps.filter(k => k in deps);
}

function computeProjectStatus(dir: string): ProjectStatus {
  const nextSteps: string[] = [];

  // ── 1. task.md — highest priority: current session tasks ──────────────
  const taskPath = join(dir, "task.md");
  let taskDone = 0;
  let taskPending = 0;
  if (existsSync(taskPath)) {
    try {
      const text = readFileSync(taskPath, "utf-8");
      const doneMatches = text.match(/- \[x\]/gi);
      const pendingMatches = text.match(/- \[ \]/g);
      if (doneMatches) taskDone += doneMatches.length;
      if (pendingMatches) taskPending += pendingMatches.length;

      // Next steps: first 3 unchecked items from task.md
      const lines = text.split("\n");
      for (const line of lines) {
        if (nextSteps.length >= 3) break;
        const m = line.match(/^[-*]\s+\[ \]\s+(.+)/);
        if (m) nextSteps.push(m[1].trim());
      }
    } catch { /* empty */ }
  }

  // ── 2. plan.md — phase-level progress ────────────────────────────────
  const planPath = join(dir, "plan.md");
  let planDone = 0;
  let planPending = 0;
  if (existsSync(planPath)) {
    try {
      const text = readFileSync(planPath, "utf-8");
      const doneMatches = text.match(/- \[x\]/gi);
      const pendingMatches = text.match(/- \[ \]/g);
      if (doneMatches) planDone += doneMatches.length;
      if (pendingMatches) planPending += pendingMatches.length;

      // Fill next steps from plan.md if task.md had none
      if (nextSteps.length === 0) {
        const lines = text.split("\n");
        for (const line of lines) {
          if (nextSteps.length >= 3) break;
          const m = line.match(/^[-*]\s+\[ \]\s+(.+)/);
          if (m) nextSteps.push(m[1].trim());
        }
      }
    } catch { /* empty */ }
  }

  // ── 3. Remaining .md files (root + .planning/) ───────────────────────
  const mdFiles: string[] = [];
  try {
    for (const f of readdirSync(dir)) {
      if (f.endsWith(".md") && f !== "task.md" && f !== "plan.md") {
        mdFiles.push(join(dir, f));
      }
    }
  } catch { /* empty */ }
  const planningDir = join(dir, ".planning");
  if (existsSync(planningDir)) {
    try {
      for (const f of readdirSync(planningDir)) {
        if (f.endsWith(".md")) mdFiles.push(join(planningDir, f));
      }
    } catch { /* empty */ }
  }

  let otherDone = 0;
  let otherPending = 0;
  for (const filePath of mdFiles) {
    try {
      const text = readFileSync(filePath, "utf-8");
      const doneMatches = text.match(/- \[x\]/gi);
      const pendingMatches = text.match(/- \[ \]/g);
      if (doneMatches) otherDone += doneMatches.length;
      if (pendingMatches) otherPending += pendingMatches.length;
    } catch { /* empty */ }
  }

  // ── 4. Next steps fallback: primer.md ────────────────────────────────
  const primerPath = join(dir, "primer.md");
  if (nextSteps.length === 0 && existsSync(primerPath)) {
    try {
      const text = readFileSync(primerPath, "utf-8");
      const match = text.match(/##\s*Next Steps\s*\n([\s\S]*?)(?=\n##|$)/i);
      if (match) {
        const bullets = match[1]
          .split("\n")
          .map(l => l.replace(/^[-*]\s*/, "").trim())
          .filter(l => l && !l.startsWith("_") && l.length > 3);
        nextSteps.push(...bullets.slice(0, 3));
      }
    } catch { /* empty */ }
  }

  // ── 5. Compute percent ────────────────────────────────────────────────
  // Weight: task.md (×3) + plan.md (×2) + other (×1) — task.md is most current
  const weightedDone = taskDone * 3 + planDone * 2 + otherDone;
  const weightedTotal = (taskDone + taskPending) * 3 + (planDone + planPending) * 2 + (otherDone + otherPending);

  if (weightedTotal > 0) {
    return {
      percent: Math.round((weightedDone / weightedTotal) * 100),
      nextSteps,
      source: "checkboxes",
    };
  }

  // ── 6. Heuristic fallback ─────────────────────────────────────────────
  let percent = 5;
  if (existsSync(primerPath)) percent = 15;
  if (existsSync(planPath)) percent = 20;
  if (existsSync(planningDir) && mdFiles.some(f => f.includes(".planning"))) percent = 25;
  try {
    const text = readFileSync(primerPath, "utf-8");
    if (!/to be filled/i.test(text) && text.length > 300) percent = Math.max(percent, 30);
  } catch { /* empty */ }

  return { percent, nextSteps, source: nextSteps.length > 0 ? "primer" : "none" };
}

function scanProject(dir: string): ProjectInfo {
  const name = basename(dir);
  const type = detectProjectType(dir);
  const summary = buildProjectSummary(dir, name);
  const techStack = getKeyTech(dir);

  // Permissions & MCP from settings.local.json
  const settingsLocal = join(dir, ".claude", "settings.local.json");
  let permissionCount = 0;
  const mcpServers: MCPServer[] = [];

  if (existsSync(settingsLocal)) {
    const d = readJSON(settingsLocal);
    const perms: string[] = d.permissions?.allow || [];
    permissionCount = perms.length;

    // Extract MCPs from permissions
    const mcpMap: Record<string, string[]> = {};
    for (const p of perms) {
      if (p.startsWith("mcp__")) {
        const parts = p.split("__");
        const mcpName = parts[1];
        const tool = parts.slice(2).join("__");
        if (!mcpMap[mcpName]) mcpMap[mcpName] = [];
        if (tool) mcpMap[mcpName].push(tool);
      }
    }
    for (const [mcpName, tools] of Object.entries(mcpMap)) {
      mcpServers.push({
        name: mcpName,
        project: name,
        source: "permissions",
        tools,
      });
    }
  }

  // MCP from .mcp.json
  const mcpJsonPath = join(dir, ".mcp.json");
  if (existsSync(mcpJsonPath)) {
    const mcpData = readJSON(mcpJsonPath);
    for (const [sName, config] of Object.entries(mcpData.mcpServers || {})) {
      const cfg = config as { url?: string; command?: string; args?: string[]; headers?: Record<string, string> };
      // Don't duplicate if already found in permissions
      if (!mcpServers.find(m => m.name === sName)) {
        mcpServers.push({
          name: sName,
          project: name,
          source: "mcp.json",
          tools: [],
          url: cfg.url || cfg.command || "?",
          hasAuth: !!cfg.headers,
          command: cfg.command,
          args: cfg.args,
        });
      } else {
        // Merge url/auth info
        const existing = mcpServers.find(m => m.name === sName)!;
        existing.url = cfg.url || cfg.command;
        existing.hasAuth = !!cfg.headers;
      }
    }
  }

  // Project-level skills
  const skills: SkillInfo[] = [];
  for (const subdir of [".claude/commands", ".claude/skills"]) {
    const skillPath = join(dir, subdir);
    if (existsSync(skillPath)) {
      try {
        for (const f of readdirSync(skillPath).filter(f => f.endsWith(".md"))) {
          skills.push({ name: f.replace(".md", ""), namespace: name, scope: "project", project: name });
        }
      } catch { /* empty */ }
    }
  }

  // Project-level agents
  const agents: AgentInfo[] = [];
  const agentsPath = join(dir, ".claude", "agents");
  if (existsSync(agentsPath)) {
    try {
      for (const f of readdirSync(agentsPath).filter(f => f.endsWith(".md"))) {
        agents.push({ name: f.replace(".md", ""), scope: "project", project: name });
      }
    } catch { /* empty */ }
  }

  const status = computeProjectStatus(dir);
  return { name, path: dir, type, summary, mcpServers, skills, agents, permissionCount, techStack, status };
}

export function scan(): ScanResult {
  const global = scanGlobalConfig();
  const projects: ProjectInfo[] = [];
  const allMCPs: MCPServer[] = [...global.oauthMCPs];
  const allSkills: SkillInfo[] = [...global.skills];
  const allCommands: CommandInfo[] = [...global.commands];
  const allAgents: AgentInfo[] = [...global.agents];

  const seen = new Set<string>();
  for (const root of PROJECTS_DIRS) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root).sort()) {
      const full = join(root, entry);
      if (seen.has(full)) continue;
      if (!statSync(full).isDirectory()) continue;
      // Skip this app itself
      if (entry === "command center") continue;

      const isProject =
        existsSync(join(full, ".git")) ||
        existsSync(join(full, ".claude")) ||
        existsSync(join(full, "package.json")) ||
        existsSync(join(full, "requirements.txt")) ||
        existsSync(join(full, "Cargo.toml")) ||
        existsSync(join(full, "go.mod"));

      if (!isProject) continue;
      seen.add(full);

      const project = scanProject(full);
      projects.push(project);
      allMCPs.push(...project.mcpServers);
      allSkills.push(...project.skills);
      allAgents.push(...project.agents);
    }
  }

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
}

// ── Mutations ──────────────────────────────────────────────────────────

export function togglePlugin(pluginName: string, enabled: boolean) {
  const settingsPath = join(CLAUDE_HOME, "settings.json");
  const settings = readJSON(settingsPath);
  if (!settings.enabledPlugins) settings.enabledPlugins = {};
  settings.enabledPlugins[pluginName] = enabled;
  writeJSON(settingsPath, settings);
}

function findProjectDir(projectName: string): string | null {
  for (const root of PROJECTS_DIRS) {
    const candidate = join(root, projectName);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function removeMCPFromProject(projectName: string, mcpName: string): { removed: boolean; source: string } {
  const projectDir = findProjectDir(projectName);
  if (!projectDir) return { removed: false, source: "project not found" };

  // Remove from .mcp.json
  const mcpJsonPath = join(projectDir, ".mcp.json");
  let removedFromMcpJson = false;
  if (existsSync(mcpJsonPath)) {
    const data = readJSON(mcpJsonPath);
    if (data.mcpServers && data.mcpServers[mcpName]) {
      delete data.mcpServers[mcpName];
      writeJSON(mcpJsonPath, data);
      removedFromMcpJson = true;
    }
  }

  // Remove permissions
  const settingsLocal = join(projectDir, ".claude", "settings.local.json");
  let removedFromPerms = false;
  if (existsSync(settingsLocal)) {
    const data = readJSON(settingsLocal);
    const perms: string[] = data.permissions?.allow || [];
    const filtered = perms.filter(p => !p.startsWith(`mcp__${mcpName}__`) && p !== `mcp__${mcpName}`);
    if (filtered.length !== perms.length) {
      data.permissions.allow = filtered;
      writeJSON(settingsLocal, data);
      removedFromPerms = true;
    }
  }

  return {
    removed: removedFromMcpJson || removedFromPerms,
    source: removedFromMcpJson ? "mcp.json" : removedFromPerms ? "permissions" : "not found",
  };
}

export function removeGlobalAgent(agentName: string): boolean {
  const agentPath = join(CLAUDE_HOME, "agents", `${agentName}.md`);
  if (existsSync(agentPath)) {
    const { unlinkSync } = require("fs");
    unlinkSync(agentPath);
    return true;
  }
  return false;
}

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
