import { NextResponse } from "next/server";

export interface SearchResult {
  name: string;
  description: string;
  url: string;
  stars?: number;
  source: "github";
  type: "mcp" | "plugin" | "skill";
  relevance: string;
  repoFullName: string; // owner/repo
}

const typeQueries: Record<string, string> = {
  mcp: "mcp server claude",
  plugin: "claude code plugin",
  skill: "claude code skill command",
};

async function searchGitHub(query: string, type: "mcp" | "plugin" | "skill"): Promise<SearchResult[]> {
  const q = encodeURIComponent(`${query} ${typeQueries[type]}`);
  try {
    const ghHeaders: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
    if (process.env.GITHUB_TOKEN) ghHeaders["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(
      `https://api.github.com/search/repositories?q=${q}&sort=stars&per_page=20`,
      { headers: ghHeaders }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map(
      (item: { full_name: string; description: string; html_url: string; stargazers_count: number }) => ({
        name: item.full_name,
        description: item.description || "",
        url: item.html_url,
        stars: item.stargazers_count,
        source: "github" as const,
        type,
        relevance: "",
        repoFullName: item.full_name,
      })
    );
  } catch {
    return [];
  }
}

function scoreRelevance(result: SearchResult, projectContext: string): SearchResult {
  const text = `${result.name} ${result.description}`.toLowerCase();
  const contextWords = projectContext.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const matches = contextWords.filter(w => text.includes(w));
  const score = matches.length;
  let relevance = "low";
  if (score >= 3) relevance = "high";
  else if (score >= 1) relevance = "medium";
  return { ...result, relevance };
}

export async function POST(req: Request) {
  try {
    const { query, type, projectContext } = await req.json();
    if (!query || !type) {
      return NextResponse.json({ error: "query and type required" }, { status: 400 });
    }

    let results = await searchGitHub(query, type);

    // Deduplicate by repoFullName (keeps first occurrence = highest starred)
    const seen = new Set<string>();
    results = results.filter(r => {
      if (seen.has(r.repoFullName)) return false;
      seen.add(r.repoFullName);
      return true;
    });

    if (projectContext) {
      results = results.map(r => scoreRelevance(r, projectContext));
      results.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.relevance as keyof typeof order] ?? 3) - (order[b.relevance as keyof typeof order] ?? 3);
      });
    }

    return NextResponse.json({ results: results.slice(0, 15) });
  } catch (error) {
    return NextResponse.json({ error: "Search failed", details: String(error) }, { status: 500 });
  }
}
