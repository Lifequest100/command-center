import { appendFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { CLAUDE_HOME } from "./config";

const ACTIVITY_FILE = join(CLAUDE_HOME, "command-center-activity.ndjson");

export interface ActivityEntry {
  timestamp: string;
  action: string;
  details: string;
}

export function logActivity(action: string, details: string) {
  const entry: ActivityEntry = { timestamp: new Date().toISOString(), action, details };
  try {
    appendFileSync(ACTIVITY_FILE, JSON.stringify(entry) + "\n");
  } catch { /* ignore if ~/.claude doesn't exist yet */ }
}

export function readActivity(limit = 100): ActivityEntry[] {
  if (!existsSync(ACTIVITY_FILE)) return [];
  try {
    return readFileSync(ACTIVITY_FILE, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map(l => JSON.parse(l) as ActivityEntry)
      .slice(-limit)
      .reverse();
  } catch { return []; }
}
