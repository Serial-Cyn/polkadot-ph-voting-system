"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    // no-op for now; we only require window.ethereum when the user clicks connect
  }, []);

  async function connectEvmWallet() {
    setError(null);
    setLoading(true);
    try {
      // @ts-ignore
      const eth = (window as any).ethereum;
      if (!eth || typeof eth.request !== 'function') {
        setError('No EVM wallet detected');
        setLoading(false);
        return;
      }

      // Request accounts (this will prompt MetaMask / Coinbase wallet UI)
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      if (!Array.isArray(accounts) || accounts.length === 0) {
        setError('No accounts returned');
        setLoading(false);
        return;
      }

      const address = accounts[0];

      // POST to auth and wait for cookie to be set before navigating.
      const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ walletAddress: address, provider: 'evm' }), credentials: 'include' });
      const data = await res.json().catch(() => ({ ok: false, error: 'invalid response' }));
      if (!data || !data.ok) {
        setError(data?.error || 'Login failed');
        setLoading(false);
        return;
      }

  // Do not log addresses or responses containing addresses to the console

      // navigate only after auth succeeded and cookie is (likely) set
      router.push('/dashboard');
    } catch (err: any) {
      setError(String(err) || 'Failed to connect EVM wallet');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="p-8 bg-white rounded shadow w-full max-w-md fade-in">
        <h2 className="text-2xl mb-4">Connect your wallet</h2>
        <div className="grid gap-3">
          <button className="btn" onClick={connectEvmWallet}>Connect MetaMask / Coinbase</button>
        </div>
        {error && <div className="text-red-600 mt-3">{error}</div>}
      </div>
    </div>
  );
}
