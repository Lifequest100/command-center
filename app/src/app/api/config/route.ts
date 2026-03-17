import { NextResponse } from "next/server";
import { CLAUDE_HOME, PROJECTS_DIRS } from "@/lib/config";

export async function GET() {
  return NextResponse.json({ claudeHome: CLAUDE_HOME, projectsDirs: PROJECTS_DIRS });
}
