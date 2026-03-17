import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { CLAUDE_HOME, PROJECTS_DIRS } from "@/lib/config";
import { logActivity } from "@/lib/activity";

function findProjectDir(name: string): string | null {
  for (const root of PROJECTS_DIRS) {
    const dir = join(root, name);
    if (existsSync(dir)) return dir;
  }
  return null;
}

function readJSON(path: string): Record<string, unknown> {
  try { return JSON.parse(readFileSync(path, "utf-8")); } catch { return {}; }
}
function writeJSON(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "command-center/1.0" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

async function fetchJSON(url: string): Promise<Record<string, unknown> | null> {
  const text = await fetchText(url);
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

// Try common branch names for raw content
async function fetchRaw(owner: string, repo: string, filePath: string): Promise<string | null> {
  for (const branch of ["main", "master", "HEAD"]) {
    const text = await fetchText(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`
    );
    if (text) return text;
  }
  return null;
}

async function installMCP(repoFullName: string, targetProject: string | null): Promise<{ ok: boolean; message: string }> {
  const [owner, repo] = repoFullName.split("/");

  // Try to find npm package name from package.json
  const raw = await fetchRaw(owner, repo, "package.json");
  let packageName: string | null = null;
  if (raw) {
    try {
      const pkg = JSON.parse(raw) as { name?: string };
      if (pkg.name) packageName = pkg.name;
    } catch { /* ignore */ }
  }

  if (!packageName) {
    packageName = repo; // fallback to repo name
  }

  const mcpEntry = {
    command: "npx",
    args: ["-y", packageName],
  };

  if (targetProject) {
    // Install to project .mcp.json
    const projectDir = findProjectDir(targetProject);
    if (!projectDir) return { ok: false, message: `Project "${targetProject}" not found` };
    const mcpJsonPath = join(projectDir, ".mcp.json");
    const data = readJSON(mcpJsonPath) as { mcpServers?: Record<string, unknown> };
    if (!data.mcpServers) data.mcpServers = {};
    const key = packageName.replace(/^@[^/]+\//, "").replace(/[^a-z0-9-]/g, "-");
    data.mcpServers[key] = mcpEntry;
    writeJSON(mcpJsonPath, data);
    return { ok: true, message: `Added "${key}" to ${targetProject}/.mcp.json` };
  } else {
    // Install globally (not common for MCPs but handle gracefully)
    return { ok: false, message: "Please select a project to install this MCP to" };
  }
}

async function installSkill(repoFullName: string, namespace: string): Promise<{ ok: boolean; message: string }> {
  const [owner, repo] = repoFullName.split("/");

  // Fetch repo contents to find .md files
  const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
  const raw = await fetchText(contentsUrl);
  if (!raw) return { ok: false, message: "Could not fetch repo contents" };

  let files: { name: string; download_url: string | null; type: string }[] = [];
  try { files = JSON.parse(raw); } catch { return { ok: false, message: "Could not parse repo contents" }; }

  const mdFiles = files.filter(f => f.type === "file" && f.name.endsWith(".md") &&
    !["README.md", "CHANGELOG.md", "LICENSE.md", "CONTRIBUTING.md"].includes(f.name));

  if (mdFiles.length === 0) {
    // Try a commands/ subdirectory
    const cmdRaw = await fetchText(`https://api.github.com/repos/${owner}/${repo}/contents/commands`);
    if (cmdRaw) {
      try {
        const cmdFiles = JSON.parse(cmdRaw) as typeof files;
        mdFiles.push(...cmdFiles.filter(f => f.type === "file" && f.name.endsWith(".md")));
      } catch { /* ignore */ }
    }
  }

  if (mdFiles.length === 0) return { ok: false, message: "No skill .md files found in repo" };

  const ns = namespace || repo;
  const nsDir = join(CLAUDE_HOME, "commands", ns);
  if (!existsSync(nsDir)) mkdirSync(nsDir, { recursive: true });

  let installed = 0;
  for (const file of mdFiles.slice(0, 10)) {
    if (!file.download_url) continue;
    const content = await fetchText(file.download_url);
    if (content) {
      writeFileSync(join(nsDir, file.name), content);
      installed++;
    }
  }

  return installed > 0
    ? { ok: true, message: `Installed ${installed} skill(s) to ~/.claude/commands/${ns}/` }
    : { ok: false, message: "Could not download skill files" };
}

async function installAgent(repoFullName: string): Promise<{ ok: boolean; message: string }> {
  const [owner, repo] = repoFullName.split("/");

  // Look for a primary agent .md file
  const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
  const raw = await fetchText(contentsUrl);
  if (!raw) return { ok: false, message: "Could not fetch repo contents" };

  let files: { name: string; download_url: string | null; type: string }[] = [];
  try { files = JSON.parse(raw); } catch { return { ok: false, message: "Could not parse repo contents" }; }

  const agentFiles = files.filter(f => f.type === "file" && f.name.endsWith(".md") &&
    !["README.md", "CHANGELOG.md", "LICENSE.md"].includes(f.name));

  if (agentFiles.length === 0) return { ok: false, message: "No agent .md files found in repo" };

  const agentsDir = join(CLAUDE_HOME, "agents");
  if (!existsSync(agentsDir)) mkdirSync(agentsDir, { recursive: true });

  const file = agentFiles[0];
  if (!file.download_url) return { ok: false, message: "No download URL" };

  const content = await fetchText(file.download_url);
  if (!content) return { ok: false, message: "Could not download agent file" };

  const agentName = file.name.replace(".md", "");
  writeFileSync(join(agentsDir, file.name), content);
  return { ok: true, message: `Installed agent "${agentName}" to ~/.claude/agents/` };
}

export async function POST(req: Request) {
  try {
    const { repoFullName, type, targetProject, namespace } = await req.json();
    if (!repoFullName || !type) {
      return NextResponse.json({ error: "repoFullName and type required" }, { status: 400 });
    }

    let result: { ok: boolean; message: string };
    if (type === "mcp") {
      result = await installMCP(repoFullName, targetProject || null);
    } else if (type === "skill") {
      result = await installSkill(repoFullName, namespace || "");
    } else if (type === "plugin") {
      // Plugins use the claude CLI — we can't invoke it from here, so guide the user
      result = {
        ok: false,
        message: `Run: claude plugin install ${repoFullName} in your terminal`,
      };
    } else {
      result = { ok: false, message: `Unknown type: ${type}` };
    }

    if (result.ok) logActivity(`install-${type}`, `${repoFullName}${targetProject ? ` → ${targetProject}` : ""}`);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, message: String(error) }, { status: 500 });
  }
}
