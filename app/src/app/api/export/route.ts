import { NextResponse } from "next/server";
import { scan } from "@/lib/scanner";
import { CLAUDE_HOME, PROJECTS_DIRS } from "@/lib/config";

export async function GET() {
  try {
    const data = scan();

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      version: "1",
      meta: {
        claudeHome: CLAUDE_HOME,
        projectsDirs: PROJECTS_DIRS,
      },
      global: {
        model: data.global.model,
        plugins: data.global.plugins,
        skills: data.global.skills,
        agents: data.global.agents,
      },
      projects: data.projects.map(p => ({
        name: p.name,
        path: p.path,
        type: p.type,
        mcpServers: p.mcpServers,
        skills: p.skills,
        agents: p.agents,
      })),
    };

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="claude-config-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
