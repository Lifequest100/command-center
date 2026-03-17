import { homedir } from "os";
import { join } from "path";
import { existsSync } from "fs";

export const HOME = homedir();
export const CLAUDE_HOME = join(HOME, ".claude");

/**
 * Resolve the directory (or directories) that contain your projects.
 *
 * Priority:
 *  1. CLAUDE_CC_PROJECTS_DIR env var  (comma-separated for multiple roots)
 *  2. First existing candidate from a standard list
 *  3. Home directory as final fallback
 */
function resolveProjectsDirs(): string[] {
  const env = process.env.CLAUDE_CC_PROJECTS_DIR;
  if (env) {
    return env
      .split(",")
      .map((p) => p.trim().replace(/^~/, HOME))
      .filter(Boolean);
  }

  const candidates = ["Desktop", "Projects", "projects", "code", "dev", "src", "workspace"];
  for (const name of candidates) {
    const p = join(HOME, name);
    if (existsSync(p)) return [p];
  }

  return [HOME];
}

export const PROJECTS_DIRS: string[] = resolveProjectsDirs();

/** Backwards-compat single-dir used in display labels */
export const PROJECTS_DIR: string = PROJECTS_DIRS[0];
