import { NextResponse } from "next/server";
import { getSession, findUserById, isVotingActive, setVotingSession } from "../../../lib/data";

function parseCookies(cookieHeader?: string | null) {
  if (!cookieHeader) return {} as Record<string, string>;
  return Object.fromEntries(cookieHeader.split(";").map((c) => {
    const [k, ...v] = c.trim().split("=");
    return [k, decodeURIComponent(v.join("="))];
  }));
}

export async function GET(req: Request) {
  return NextResponse.json({ ok: true, active: isVotingActive() });
}

export async function POST(req: Request) {
  // Toggle or set voting session: only admin
  const cookieHeader = req.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const token = cookies["session"];
  const userId = getSession(token);
  if (!userId) return NextResponse.json({ ok: false, error: "not authenticated" }, { status: 401 });
  const user = findUserById(userId);
  if (!user || user.role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  if (typeof body.active === 'boolean') {
    setVotingSession(body.active);
  } else {
    // toggle
    setVotingSession(!isVotingActive());
  }

  return NextResponse.json({ ok: true, active: isVotingActive() });
}
