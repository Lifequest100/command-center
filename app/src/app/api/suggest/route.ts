import { NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export interface Suggestion {
  name: string;
  repo?: string;
  description: string;
  reason: string;
  type: "mcp" | "plugin" | "skill";
}

export async function POST(req: Request) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not set. Add it to .env.local to enable AI suggestions." },
      { status: 400 }
    );
  }

  try {
    const { projectName, projectSummary, currentMCPs } = await req.json() as {
      projectName?: string;
      projectSummary?: string;
      currentMCPs?: string[];
    };

    if (!projectSummary) {
      return NextResponse.json({ error: "projectSummary required" }, { status: 400 });
    }

    const prompt = `You are an expert on Claude Code extensions: MCP servers, plugins, and skills.

A user is working on a project called "${projectName ?? "unknown"}".

Project description:
${projectSummary}

Currently installed MCPs: ${(currentMCPs ?? []).join(", ") || "none"}

Suggest 4–6 specific MCP servers, Claude Code plugins, or custom skills that would genuinely improve this workflow. Be concrete — prefer real, published packages over hypothetical ones.

Return ONLY a valid JSON array. Each object must have:
- name: string (short display name)
- repo: string | null (GitHub "owner/repo" if known, else null)
- description: string (one sentence, what it does)
- reason: string (one sentence, why it suits THIS project specifically)
- type: "mcp" | "plugin" | "skill"

Example:
[{"name":"Playwright MCP","repo":"microsoft/playwright-mcp","description":"Browser automation via Playwright.","reason":"Useful for testing the web scraper UI.","type":"mcp"}]`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Anthropic API error: ${err}` }, { status: 502 });
    }

    const claude = await res.json() as {
      content: Array<{ type: string; text: string }>;
    };
    const text = claude.content.find(b => b.type === "text")?.text ?? "[]";

    // Extract JSON array from the response (Claude may wrap in markdown)
    const match = text.match(/\[[\s\S]*\]/);
    const suggestions: Suggestion[] = match ? JSON.parse(match[0]) : [];

    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
