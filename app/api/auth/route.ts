import { NextResponse } from "next/server";
import { validateOtp, createSession, findUserById, users } from "../../../lib/data";
// derive admin address from private key (optional)
let ADMIN_ADDRESS: string | null = null;
// Allow either a direct admin address or a private key in env.
if (process.env.ADMIN_ADDRESS && typeof process.env.ADMIN_ADDRESS === 'string' && process.env.ADMIN_ADDRESS.trim().length > 0) {
  ADMIN_ADDRESS = process.env.ADMIN_ADDRESS.trim().toLowerCase();
  } else {
  try {
    // lazily require ethers so this file doesn't fail if ethers isn't installed in some dev setups
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Wallet } = require('ethers');
    const pk = process.env.ADMIN_PRIVATE_KEY || process.env.SIGNER_PRIVATE_KEY || '';
    if (pk && typeof pk === 'string' && pk.trim().length > 0) {
      const trimmed = pk.trim();
      // If the ADMIN_PRIVATE_KEY env contains an address (0x... length 42), accept it as ADMIN_ADDRESS.
      if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
        ADMIN_ADDRESS = trimmed.toLowerCase();
      } else {
        try {
          const w = new Wallet(trimmed);
          ADMIN_ADDRESS = w.address.toLowerCase();
        } catch (e) {
          // invalid private key; ignore
          ADMIN_ADDRESS = null;
        }
      }
    }
  } catch (e) {
    // ethers not available; ADMIN_ADDRESS remains null
    ADMIN_ADDRESS = null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Wallet-based login: client sends walletAddress
    if (body && body.walletAddress) {
      const walletAddress = String(body.walletAddress).trim();
      // Log incoming wallet auth attempts (provider only, no addresses/keys)
      try {
        console.log(`[api/auth] wallet login attempt received; provider=${String(body.provider || '')}`);
      } catch (e) {
        // ignore logging errors
      }
      if (!walletAddress) return NextResponse.json({ ok: false, error: 'missing walletAddress' }, { status: 400 });

        // find or create a voter account for this walletAddress
        let user = findUserById(walletAddress);
        const isAdmin = ADMIN_ADDRESS && walletAddress.toLowerCase() === ADMIN_ADDRESS;
        if (!user) {
          // create a simple user record (in-memory) for this prototype
          const newUser = { id: walletAddress, name: isAdmin ? 'Admin' : `Wallet ${walletAddress.slice(0,6)}`, role: isAdmin ? 'admin' : 'voter', otp: '' } as any;
          users.push(newUser);
          user = newUser;
        } else {
          // if we have an admin key configured, promote this user if it matches
          if (isAdmin) user.role = 'admin';
        }

        const token = createSession(user!.id);
        const resBody: any = { ok: true, user: { id: user!.id, name: user!.name, role: user!.role } };
        try {
          console.log(`[api/auth] created session; role=${user!.role}`);
        } catch (e) {
          // ignore
        }
      if (process.env.NODE_ENV !== 'production') {
        resBody.debugToken = token;
        resBody.debugCookieValue = user!.id;
      }
      const res = NextResponse.json(resBody);
      res.cookies.set({ name: 'session', value: user!.id, httpOnly: true, path: '/', sameSite: 'strict' });
      return res;
    }

    // Fallback to OTP-based login
    let { id, otp } = body;
    id = typeof id === 'string' ? id.trim() : id;
    otp = typeof otp === 'string' ? otp.trim() : otp;
    if (!id || !otp) return NextResponse.json({ ok: false, error: "missing id or otp" }, { status: 400 });

    const user = findUserById(id);
    if (!user) return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 });

    const ok = validateOtp(id, otp);
    if (!ok) return NextResponse.json({ ok: false, error: "invalid otp" }, { status: 401 });

    const token = createSession(id);

    const resBody: any = { ok: true, user: { id: user.id, name: user.name, role: user.role } };
    if (process.env.NODE_ENV !== 'production') {
      resBody.debugToken = token;
      resBody.debugCookieValue = user.id; // help debugging what cookie value we set
    }

    const res = NextResponse.json(resBody);
    res.cookies.set({ name: 'session', value: user.id, httpOnly: true, path: '/', sameSite: 'strict' });
    return res;
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
