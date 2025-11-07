"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
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
  }, []);

  // Build a mapping positions -> candidates
  const positions = Array.from(new Set(candidates.map(c => c.position)));

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl mb-4">Dashboard</h1>
        {user && <div className="mb-4">Signed in as <strong>{user.name}</strong> ({user.id}) — role: {user.role}</div>}

        {user && user.role === 'admin' && (
          <div className="mb-4">
            <button onClick={()=>router.push('/admin')} className="bg-green-600 text-white px-3 py-1 rounded">Admin panel</button>
          </div>
        )}

        <div className="grid gap-4">
          {positions.map(pos => (
            <div key={pos} className="p-4 border rounded flex items-center justify-between">
              <div>
                <strong>{pos}</strong>
                <div className="text-sm text-zinc-600">{candidates.filter(c=>c.position===pos).length} candidate(s)</div>
              </div>
              <div>
                <button onClick={()=>router.push(`/vote/${encodeURIComponent(pos)}`)} className="bg-blue-600 text-white px-4 py-2 rounded">Vote now!</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
