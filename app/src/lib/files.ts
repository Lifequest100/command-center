import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  statSync,
} from "fs";
import { join, relative } from "path";
import { CLAUDE_HOME, PROJECTS_DIRS } from "./config";

const PROJECTS_DIR = PROJECTS_DIRS[0];

export interface MdFile {
  id: string; // unique stable key = absolute path
  path: string; // absolute path
  relativePath: string; // display path
  name: string; // filename without .md
  scope: "global" | "project";
  category: "agent" | "skill" | "claude-md" | "plan" | "other";
  project?: string;
  namespace?: string; // for skills
  size: number;
  modified: string;
}

function mdFile(
  absPath: string,
  scope: "global" | "project",
  category: MdFile["category"],
  opts: Partial<Pick<MdFile, "project" | "namespace">> = {}
): MdFile {
  const stat = statSync(absPath);
  const name = absPath.split("/").pop()!.replace(".md", "");
  return {
    id: absPath,
    path: absPath,
    relativePath: absPath
      .replace(CLAUDE_HOME, "~/.claude")
      .replace(PROJECTS_DIR, "~/Desktop"),
    name,
    scope,
    category,
    project: opts.project,
    namespace: opts.namespace,
    size: stat.size,
    modified: stat.mtime.toISOString(),
  };
}

function listDir(dir: string, ext = ".md"): string[] {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(ext))
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

export function listAllMdFiles(): { global: MdFile[]; projects: Record<string, MdFile[]> } {
  const global: MdFile[] = [];

  // Global agents
  for (const p of listDir(join(CLAUDE_HOME, "agents"))) {
    global.push(mdFile(p, "global", "agent"));
  }

  // Global skills (commands)
  const cmdsDir = join(CLAUDE_HOME, "commands");
  if (existsSync(cmdsDir)) {
    for (const ns of readdirSync(cmdsDir)) {
      const nsPath = join(cmdsDir, ns);
      if (statSync(nsPath).isDirectory()) {
        for (const p of listDir(nsPath)) {
          global.push(mdFile(p, "global", "skill", { namespace: ns }));
        }
      }
    }
  }

  // Global CLAUDE.md
  const globalClaudeMd = join(CLAUDE_HOME, "CLAUDE.md");
  if (existsSync(globalClaudeMd)) {
    global.push(mdFile(globalClaudeMd, "global", "claude-md"));
  }

  // Per-project files
  const projects: Record<string, MdFile[]> = {};

  for (const entry of readdirSync(PROJECTS_DIR).sort()) {
    const full = join(PROJECTS_DIR, entry);
    if (!statSync(full).isDirectory()) continue;
    if (entry === "command center") continue;

    const isProject =
      existsSync(join(full, ".git")) ||
      existsSync(join(full, ".claude")) ||
      existsSync(join(full, "package.json")) ||
      existsSync(join(full, "requirements.txt")) ||
      existsSync(join(full, "Cargo.toml")) ||
      existsSync(join(full, "go.mod"));

    if (!isProject) continue;

    const files: MdFile[] = [];

    // CLAUDE.md at project root
    const claudeMd = join(full, "CLAUDE.md");
    if (existsSync(claudeMd)) {
      files.push(mdFile(claudeMd, "project", "claude-md", { project: entry }));
    }

    // primer.md at project root
    const primerMd = join(full, "primer.md");
    if (existsSync(primerMd)) {
      files.push(mdFile(primerMd, "project", "claude-md", { project: entry }));
    }

    // .claude/agents
    for (const p of listDir(join(full, ".claude", "agents"))) {
      files.push(mdFile(p, "project", "agent", { project: entry }));
    }

    // .claude/commands / .claude/skills
    for (const subdir of ["commands", "skills"]) {
      for (const p of listDir(join(full, ".claude", subdir))) {
        files.push(mdFile(p, "project", "skill", { project: entry }));
      }
    }

    // .planning/*.md (PROJECT.md, roadmap, etc.)
    const planningDir = join(full, ".planning");
    if (existsSync(planningDir)) {
      for (const p of listDir(planningDir)) {
        files.push(mdFile(p, "project", "plan", { project: entry }));
      }
    }

    if (files.length > 0) {
      projects[entry] = files;
    }
  }

  return { global, projects };
}

export function readMdFile(absPath: string): string {
  // Safety: only allow reads within CLAUDE_HOME or PROJECTS_DIR
  if (!absPath.startsWith(CLAUDE_HOME) && !absPath.startsWith(PROJECTS_DIR)) {
    throw new Error("Access denied: path outside allowed directories");
  }
  return readFileSync(absPath, "utf-8");
}

export function writeMdFile(absPath: string, content: string): void {
  if (!absPath.startsWith(CLAUDE_HOME) && !absPath.startsWith(PROJECTS_DIR)) {
    throw new Error("Access denied: path outside allowed directories");
  }
  writeFileSync(absPath, content, "utf-8");
}
