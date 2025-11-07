import { NextResponse } from "next/server";
import { users } from "../../../../lib/data";

// Debug route to list in-memory users and OTPs (for demo only).
export async function GET() {
  return NextResponse.json({ ok: true, users });
}
