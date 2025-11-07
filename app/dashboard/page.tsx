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

  useEffect(()=>{
    fetch('/api/me', { credentials: 'include' })
      .then(r=>r.json())
      .then(d=>{ if (d.ok) setUser(d.user); else router.push('/login'); })
      .catch(()=>router.push('/login'));

    fetch('/api/candidates')
      .then(r=>r.json())
      .then(d=>{ if (d.ok && Array.isArray(d.candidates)) setCandidates(d.candidates); else if (Array.isArray(d)) setCandidates(d); else setCandidates([]); })
      .catch(()=>{});

    fetch('/api/tally')
      .then(r=>r.json())
      .then(d=>{ if (d.ok) setTally(d.tally || {}); })
      .catch(()=>{});
    fetch('/api/session').then(r=>r.json()).then(d=>{ if (d.ok) setSessionActive(d.active); }).catch(()=>{});
  }, []);

  // Dashboard now shows tally and session status; voting happens on /vote
  const positions = Array.from(new Set(candidates.map((c) => c.position)));

  async function doLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login';
  }

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
