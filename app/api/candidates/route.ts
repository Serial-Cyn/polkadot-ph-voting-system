import { NextResponse } from "next/server";
import { candidates, addCandidate, getSession, findUserById } from "../../../lib/data";

function parseCookies(cookieHeader?: string | null) {
  if (!cookieHeader) return {} as Record<string, string>;
  return Object.fromEntries(cookieHeader.split(";").map((c) => {
    const [k, ...v] = c.trim().split("=");
    return [k, decodeURIComponent(v.join("="))];
  }));
}

export async function GET(req: Request) {
  return NextResponse.json({ ok: true, candidates });
}

export async function POST(req: Request) {
  // Only admin may add candidates
  const cookieHeader = req.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const token = cookies["session"];
  const userId = getSession(token);
  if (!userId) return NextResponse.json({ ok: false, error: "not authenticated" }, { status: 401 });
  const user = findUserById(userId);
  if (!user || user.role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, position } = body;
  if (!name || !position) return NextResponse.json({ ok: false, error: "missing name or position" }, { status: 400 });

  const cand = addCandidate({ name, position });
  return NextResponse.json({ ok: true, candidate: cand });
}
