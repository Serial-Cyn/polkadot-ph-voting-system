import { NextResponse } from "next/server";
import { sessions, users } from "../../../../lib/data";

// Development-only endpoint to inspect in-memory sessions and users.
export async function GET() {
  const safeUsers = users.map(u => ({ id: u.id, name: u.name, role: u.role, otp: u.otp }));
  return NextResponse.json({ ok: true, sessions, users: safeUsers });
}
