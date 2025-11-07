import { NextResponse } from "next/server";
import { validateOtp, createSession, findUserById, users, sessions } from "../../../lib/data";
// derive admin address from private key (optional)
// Resolve admin address at runtime (reads env each request so a restart isn't required)
function getAdminAddress(): string | null {
  const envAddr = process.env.ADMIN_ADDRESS;
  if (envAddr && typeof envAddr === 'string' && envAddr.trim().length > 0) return envAddr.trim().toLowerCase();

  // If not present in process.env, try to read .env or .env.local so changes
  // on disk are picked up without restarting the dev server.
  try {
    // eslint-disable-next-line node/no-sync
    const fs = require('fs');
    const path = require('path');
    const root = process.cwd();
    const candidates = ['.env.local', '.env'];
    for (const fname of candidates) {
      const p = path.join(root, fname);
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        for (const line of raw.split(/\r?\n/)) {
          const m = line.match(/^\s*ADMIN_ADDRESS\s*=\s*(.+)\s*$/i);
          if (m) return m[1].trim().toLowerCase();
          const m2 = line.match(/^\s*ADMIN_PRIVATE_KEY\s*=\s*(.+)\s*$/i);
          if (m2) {
            const val = m2[1].trim();
            if (/^0x[0-9a-fA-F]{40}$/.test(val)) return val.toLowerCase();
            // otherwise fall through to try derive below
            // set pk variable
            // eslint-disable-next-line no-var
            var __pk_from_env_file = val; // intentionally var-scoped
          }
        }
      }
    }
    if (typeof __pk_from_env_file !== 'undefined') {
      // proceed with __pk_from_env_file
      const pk = __pk_from_env_file;
      if (pk && typeof pk === 'string' && pk.trim().length > 0) {
        const trimmed = pk.trim();
        if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return trimmed.toLowerCase();
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { Wallet } = require('ethers');
          const w = new Wallet(trimmed);
          return w.address.toLowerCase();
        } catch (e) {
          return null;
        }
      }
    }
  } catch (e) {
    // ignore read errors
  }

  const pk = process.env.ADMIN_PRIVATE_KEY || process.env.SIGNER_PRIVATE_KEY || '';
  if (pk && typeof pk === 'string' && pk.trim().length > 0) {
    const trimmed = pk.trim();
    if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return trimmed.toLowerCase();
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Wallet } = require('ethers');
      const w = new Wallet(trimmed);
      return w.address.toLowerCase();
    } catch (e) {
      return null;
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Wallet-based login: client sends walletAddress
    if (body && body.walletAddress) {
      // normalize address to lowercase for consistent lookup/storage
      const walletAddress = String(body.walletAddress).trim().toLowerCase();
      // Log incoming wallet auth attempts (provider only, no addresses/keys)
      try {
        console.log(`[api/auth] wallet login attempt received; provider=${String(body.provider || '')}`);
      } catch (e) {
        // ignore logging errors
      }
      if (!walletAddress) return NextResponse.json({ ok: false, error: 'missing walletAddress' }, { status: 400 });

        // find or create a voter account for this walletAddress
        let user = findUserById(walletAddress);
  const ADMIN_ADDRESS = getAdminAddress();
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

        // create a signed session token so session is valid across requests/processes
        // lazy-require signSession
        let sessionToken: string | null = null;
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { signSession } = require('../../../lib/session');
          sessionToken = signSession({ userId: user!.id, role: user!.role, name: user!.name });
        } catch (e) {
          // fallback to in-memory session token
          const t = createSession(user!.id);
          sessionToken = t;
          sessions[sessionToken] = { userId: user!.id, expires: Date.now() + 1000 * 60 * 60 * 8 };
        }

        const resBody: any = { ok: true, user: { id: user!.id, name: user!.name, role: user!.role } };
        try {
          console.log(`[api/auth] created session; role=${user!.role}`);
        } catch (e) {
          // ignore
        }
      if (process.env.NODE_ENV !== 'production') {
        resBody.debugToken = sessionToken;
        resBody.debugCookieValue = user!.id;
      }
  const res = NextResponse.json(resBody);
  // set signed session token
  res.cookies.set({ name: 'session', value: sessionToken || user!.id, httpOnly: true, path: '/', sameSite: 'lax' });
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
    // try to sign a stateless token as well
    let sessionToken: string | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { signSession } = require('../../../lib/session');
      sessionToken = signSession({ userId: user.id, role: user.role, name: user.name });
    } catch (e) {
      sessionToken = token;
    }

    const resBody: any = { ok: true, user: { id: user.id, name: user.name, role: user.role } };
    if (process.env.NODE_ENV !== 'production') {
      resBody.debugToken = sessionToken;
      resBody.debugCookieValue = user.id; // help debugging what cookie value we set
    }

    const res = NextResponse.json(resBody);
    res.cookies.set({ name: 'session', value: sessionToken || user.id, httpOnly: true, path: '/', sameSite: 'lax' });
    return res;
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
