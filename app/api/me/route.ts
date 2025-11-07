import { NextResponse } from "next/server";
import { getSession, findUserById } from "../../../lib/data";

function parseCookies(cookieHeader?: string | null) {
  if (!cookieHeader) return {} as Record<string, string>;
  return Object.fromEntries(cookieHeader.split(";").map((c) => {
    const [k, ...v] = c.trim().split("=");
    return [k, decodeURIComponent(v.join("="))];
  }));
}

export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const token = cookies["session"];
  // Debug logging: show token and resolution path (no secrets)
  try {
    console.log('[api/me] cookie token present?', !!token);
  } catch (e) {}

  const userId = getSession(token);
  try {
    console.log('[api/me] resolved userId:', userId);
  } catch (e) {}

  if (!userId) return NextResponse.json({ ok: false, user: null });
  const user = findUserById(userId);
  try {
    console.log('[api/me] user found?', !!user, 'role=', user?.role);
  } catch (e) {}
  return NextResponse.json({ ok: true, user: user ? { id: user.id, name: user.name, role: user.role } : null });
}
