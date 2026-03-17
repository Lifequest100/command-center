import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { scan } from "@/lib/scanner";

type HealthStatus = "ok" | "error" | "unknown";

async function checkMCPHealth(name: string, command: string, args: string[]): Promise<HealthStatus> {
  try {
    if (command === "npx" && args.length >= 2) {
      // Extract package name (strip -y flag)
      const pkg = args.find(a => !a.startsWith("-")) ?? args[1];
      // npm view is fast — just checks registry, doesn't install
      execSync(`npm view ${pkg} version`, { timeout: 8000, stdio: "ignore" });
      return "ok";
    }
    if (command === "uvx" || command === "python" || command === "node") {
      // Can't easily check without running — mark as unknown
      return "unknown";
    }
    // For other commands, check if the binary exists
    execSync(`which ${command}`, { timeout: 3000, stdio: "ignore" });
    return "ok";
  } catch {
    return "error";
  }
}

export async function GET() {
  try {
    const data = scan();
    const unique = new Map<string, { command: string; args: string[] }>();
    for (const mcp of data.allMCPs) {
      if (!unique.has(mcp.name)) {
        unique.set(mcp.name, { command: mcp.command ?? "npx", args: mcp.args ?? [] });
      }
    }

    const results: Record<string, HealthStatus> = {};
    await Promise.all(
      Array.from(unique.entries()).map(async ([name, { command, args }]) => {
        results[name] = await checkMCPHealth(name, command, args);
      })
    );

    return NextResponse.json({ health: results });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
