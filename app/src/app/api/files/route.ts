import { NextResponse } from "next/server";
import { listAllMdFiles, readMdFile, writeMdFile } from "@/lib/files";

// GET /api/files — list all, or ?path=... to read one
export async function GET(req: Request) {
  const url = new URL(req.url);
  const path = url.searchParams.get("path");

  if (path) {
    try {
      const content = readMdFile(path);
      return NextResponse.json({ path, content });
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 400 });
    }
  }

  try {
    const result = listAllMdFiles();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/files — write { path, content }
export async function POST(req: Request) {
  try {
    const { path, content } = await req.json();
    if (!path || content === undefined) {
      return NextResponse.json({ error: "path and content required" }, { status: 400 });
    }
    writeMdFile(path, content);
    return NextResponse.json({ ok: true, path });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
