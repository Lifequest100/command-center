import { NextResponse } from "next/server";
import { scan } from "@/lib/scanner";

export async function GET() {
  try {
    const result = scan();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Scan failed", details: String(error) },
      { status: 500 }
    );
  }
}
