import { NextResponse } from "next/server";

function getAdminAddress(): string | null {
  const envAddr = process.env.ADMIN_ADDRESS;
  if (envAddr && typeof envAddr === 'string' && envAddr.trim().length > 0) return envAddr.trim().toLowerCase();

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

export async function GET() {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ ok: false, error: 'not available' }, { status: 404 });
  return NextResponse.json({ ok: true, adminAddress: getAdminAddress() });
}
