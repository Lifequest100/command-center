import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";
import { PROJECTS_DIRS } from "@/lib/config";
import { logActivity } from "@/lib/activity";

function readJSON(path: string): Record<string, unknown> {
  try { return JSON.parse(readFileSync(path, "utf-8")); } catch { return {}; }
}

/** Deterministic port 4000–4999 so projects never collide with command center (3000). */
function projectPort(name: string): number {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return 4000 + (hash % 1000);
}

function findProjectDir(name: string): string | null {
  for (const root of PROJECTS_DIRS) {
    const candidate = join(root, name);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function detectDevCommand(dir: string, projectName: string): { cmd: string; args: string[]; port: number } {
  const port = projectPort(projectName);
  const pkgPath = join(dir, "package.json");

  if (existsSync(pkgPath)) {
    const pkg = readJSON(pkgPath) as { scripts?: Record<string, string>; dependencies?: Record<string, string> };
    const scripts = pkg.scripts || {};
    const deps = pkg.dependencies || {};

    const scriptName = "dev" in scripts ? "dev" : "start" in scripts ? "start" : null;
    if (scriptName) {
      const script = scripts[scriptName] || "";
      // If the script hardcodes a port, respect it
      const portMatch = script.match(/(?:--port|-p)\s+(\d+)/);
      if (portMatch) return { cmd: "npm", args: ["run", scriptName], port: parseInt(portMatch[1]) };
      // Vite default is 5173 but we still inject PORT
      void deps; // checked via script text
      return { cmd: "npm", args: ["run", scriptName], port };
    }
  }

  // Python / uvicorn
  if (existsSync(join(dir, "requirements.txt")) || existsSync(join(dir, "pyproject.toml"))) {
    return { cmd: "python", args: ["-m", "uvicorn", "main:app", "--reload", "--port", String(port)], port };
  }

  // Rust / cargo
  if (existsSync(join(dir, "Cargo.toml"))) {
    return { cmd: "cargo", args: ["run"], port };
  }

  return { cmd: "npm", args: ["run", "dev"], port };
}

export async function POST(req: Request) {
  try {
    const { projectName } = await req.json() as { projectName?: string };
    if (!projectName) return NextResponse.json({ error: "projectName required" }, { status: 400 });

    const dir = findProjectDir(projectName);
    if (!dir) return NextResponse.json({ error: "Project directory not found" }, { status: 404 });

    const { cmd, args, port } = detectDevCommand(dir, projectName);

    const child = spawn(cmd, args, {
      cwd: dir,
      detached: true,
      stdio: "ignore",
      env: { ...process.env, PORT: String(port) },
    });
    child.unref();

    logActivity("start-project", `${projectName} — port ${port} (${cmd} ${args.join(" ")})`);

    // Brief pause for the server to bind
    await new Promise(r => setTimeout(r, 1500));

    return NextResponse.json({ ok: true, url: `http://localhost:${port}`, port, command: `${cmd} ${args.join(" ")}` });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
