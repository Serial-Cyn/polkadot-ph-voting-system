// Minimal signed session token helper (HMAC-SHA256) - NOT a full JWT lib.
// Uses a server-side secret from process.env.SESSION_SECRET (or ADMIN_PRIVATE_KEY fallback)
import crypto from 'crypto';

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function getSecret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_PRIVATE_KEY || 'dev-secret';
}

export function signSession(payload: Record<string, any>, ttlMs = 1000 * 60 * 60 * 8) {
  const exp = Date.now() + ttlMs;
  const body = { ...payload, exp };
  const bodyJson = JSON.stringify(body);
  const bodyB64 = base64url(Buffer.from(bodyJson));
  const h = crypto.createHmac('sha256', getSecret()).update(bodyB64).digest();
  const sig = base64url(h);
  return `${bodyB64}.${sig}`;
}

export function verifySession(token: string) {
  try {
    const [bodyB64, sig] = token.split('.');
    if (!bodyB64 || !sig) return null;
    const expected = base64url(crypto.createHmac('sha256', getSecret()).update(bodyB64).digest());
    if (sig !== expected) return null;
    const bodyJson = Buffer.from(bodyB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const body = JSON.parse(bodyJson);
    if (typeof body.exp === 'number' && Date.now() > body.exp) return null;
    return body;
  } catch (e) {
    return null;
  }
}
