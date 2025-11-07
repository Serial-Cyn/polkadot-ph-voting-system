"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [tally, setTally] = useState<any>({});
  const [presidentChoice, setPresidentChoice] = useState<string | null>(null);
  const [vpChoice, setVpChoice] = useState<string | null>(null);
  const [senatorChoices, setSenatorChoices] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [votedPositions, setVotedPositions] = useState<Record<string, boolean>>({});
  const [sessionActive, setSessionActive] = useState<boolean | null>(null);
  const router = useRouter();
  const [authFailed, setAuthFailed] = useState<boolean>(false);

  useEffect(()=>{
    let cancelled = false;
    // Always fetch public candidates and tally so the dashboard shows content
    // even if auth is delayed or fails.
    fetch('/api/candidates')
      .then(r=>r.json())
      .then(d=>{ if (d.ok && Array.isArray(d.candidates)) setCandidates(d.candidates); else if (Array.isArray(d)) setCandidates(d); else setCandidates([]); })
      .catch(()=>{});

    fetch('/api/tally')
      .then(r=>r.json())
      .then(d=>{ if (d.ok) setTally(d.tally || {}); })
      .catch(()=>{});

    async function checkMe(retries = 6) {
      for (let i = 0; i < retries; i++) {
        try {
          const r = await fetch('/api/me', { credentials: 'include' });
          const d = await r.json().catch(() => ({ ok: false }));
          if (d && d.ok) {
            if (!cancelled) setUser(d.user);
            // after successful auth, fetch session state
            try {
              const sRes = await fetch('/api/session');
              const sJson = await sRes.json().catch(() => ({}));
              if (sJson && sJson.ok) setSessionActive(sJson.active);
            } catch (e) {}
            return;
          }
        } catch (err) {
          // ignore and retry
        }
        // small backoff before retrying
        await new Promise((res) => setTimeout(res, 300));
      }
      if (!cancelled) setAuthFailed(true);
    }
    checkMe().catch(()=>router.push('/login'));
    return () => { cancelled = true; };
  }, []);

  // Dashboard now shows tally and session status; voting happens on /vote
  const positions = Array.from(new Set(candidates.map((c) => c.position)));

  async function doLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    // clear client-side user state and navigate to login
    setUser(null);
    window.location.href = '/login';
  }

  // If server-side auth hasn't resolved but the user has a connected wallet
  // in the browser (MetaMask), show a temporary client-side user so UI
  // (Vote / Logout) remains available. This improves UX during auth races.
  useEffect(() => {
    if (user) return; // server already set user
    // @ts-ignore
    const eth = typeof window !== 'undefined' ? (window as any).ethereum : null;
    if (!eth || typeof eth.request !== 'function') return;
    let cancelled = false;
    (async () => {
      try {
        const accounts: string[] = await eth.request({ method: 'eth_accounts' });
        if (!cancelled && Array.isArray(accounts) && accounts.length > 0) {
          const addr = String(accounts[0]).toLowerCase();
          setUser({ id: addr, name: `Wallet ${addr.slice(0,6)}`, role: 'voter (unverified)' });
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl mb-4">Dashboard</h1>
        {user && (
          <div className="mb-4 flex items-center justify-between">
            <div>
              Signed in as <strong>{user.name}</strong> ({user.id}) — role: {user.role}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/vote')} className={`btn`} disabled={sessionActive === false}>Vote now!</button>
              <button onClick={doLogout} className="bg-gray-600 text-white px-3 py-1 rounded">Log out</button>
            </div>
          </div>
        )}
        {!user && authFailed && (
          <div className="mb-4 text-red-600">
            Authentication failed or timed out. Please <a href="/login" className="underline">return to login</a> and try again.
          </div>
        )}
        {user && user.role === 'admin' && (
          <div className="mb-4">
            <button onClick={() => router.push('/admin')} className="bg-green-600 text-white px-3 py-1 rounded">Admin panel</button>
          </div>
        )}

        <div className="card mb-6">
          <h2>Voting status</h2>
          <div>{sessionActive ? 'Active' : 'Inactive'}</div>
        </div>

        <section className="mt-2">
          <h2>Current Tally</h2>
          {positions.map((pos) => (
            <div key={pos} className="mb-4">
              <h3>{pos}</h3>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="p-2">Candidate</th>
                    <th className="p-2">Votes</th>
                  </tr>
                </thead>
                <tbody>
                  {(tally[pos] || []).map((row: any) => (
                    <tr key={row.candidateId} className="border-t">
                      <td className="p-2">{row.name}</td>
                      <td className="p-2">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
