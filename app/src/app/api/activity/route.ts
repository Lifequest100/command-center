import { NextResponse } from "next/server";
import { readActivity, logActivity } from "@/lib/activity";

export async function GET() {
  return NextResponse.json({ entries: readActivity(100) });
}

export async function POST(req: Request) {
  try {
    const { action, details } = await req.json() as { action?: string; details?: string };
    if (!action) return NextResponse.json({ error: "action required" }, { status: 400 });
    logActivity(action, details ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
