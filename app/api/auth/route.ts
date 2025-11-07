import { NextResponse } from "next/server";
import { validateOtp, createSession, findUserById } from "../../../lib/data";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, otp } = body;
    if (!id || !otp) return NextResponse.json({ ok: false, error: "missing id or otp" }, { status: 400 });

    const user = findUserById(id);
    if (!user) return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 });

    const ok = validateOtp(id, otp);
    if (!ok) return NextResponse.json({ ok: false, error: "invalid otp" }, { status: 401 });

    const token = createSession(id);

    // Set cookie - HttpOnly, Path=/, simple long-ish ttl
    const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
    res.headers.set("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict`);
    return res;
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
