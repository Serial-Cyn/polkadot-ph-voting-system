"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function VotePage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [presidentChoice, setPresidentChoice] = useState<string | null>(null);
  const [vpChoice, setVpChoice] = useState<string | null>(null);
  const [senatorChoices, setSenatorChoices] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(()=>{
    fetch('/api/candidates').then(r=>r.json()).then(d=>{ if (d.ok && Array.isArray(d.candidates)) setCandidates(d.candidates); else if (Array.isArray(d)) setCandidates(d); }).catch(()=>{});
    fetch('/api/session').then(r=>r.json()).then(d=>{ if (d.ok) setSessionActive(d.active); }).catch(()=>{});
  }, []);

  function toggleSenator(id: string) {
    setSenatorChoices(s => s.includes(id) ? s.filter(x=>x!==id) : s.concat(id));
  }

  async function submitPosition(position: string, candidateIds: string[]) {
    setMessage(null);
    try {
      const res = await fetch('/api/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position, candidateIds }), credentials: 'include' });
      const d = await res.json();
      if (!d.ok) { setMessage(d.error || 'Vote failed'); return; }
      setMessage(`${position}: Vote recorded (tx ${d.txHash || 'n/a'})`);
      // optionally navigate back
      setTimeout(()=>router.push('/dashboard'), 1200);
    } catch (err:any) { setMessage(String(err)); }
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl mb-4">Voting Form</h1>
        <div className="mb-4">
          <button onClick={()=>router.back()} className="bg-gray-600 text-white px-3 py-1 rounded">Back</button>
        </div>

        {sessionActive === false && <div className="mb-4 text-red-600">Voting session is not active.</div>}

        <section className="card mb-4">
          <h2>President</h2>
          {candidates.filter(c=>c.position==='President').map(c=> (
            <label key={c.id} className="flex items-center gap-3 p-2">
              <input type="radio" name="pres" checked={presidentChoice===c.id} onChange={()=>setPresidentChoice(c.id)} disabled={sessionActive===false} />
              <div className="font-medium">{c.name}</div>
            </label>
          ))}
          <div className="mt-2">
            <button className="btn" onClick={()=>submitPosition('President', presidentChoice ? [presidentChoice] : [])} disabled={sessionActive===false}>Vote President</button>
          </div>
        </section>

        <section className="card mb-4">
          <h2>Vice President</h2>
          {candidates.filter(c=>c.position==='Vice President').map(c=> (
            <label key={c.id} className="flex items-center gap-3 p-2">
              <input type="radio" name="vp" checked={vpChoice===c.id} onChange={()=>setVpChoice(c.id)} disabled={sessionActive===false} />
              <div className="font-medium">{c.name}</div>
            </label>
          ))}
          <div className="mt-2">
            <button className="btn" onClick={()=>submitPosition('Vice President', vpChoice ? [vpChoice] : [])} disabled={sessionActive===false}>Vote Vice President</button>
          </div>
        </section>

        <section className="card mb-4">
          <h2>Senator (select up to 12)</h2>
          <div className="grid grid-cols-2 gap-2">
            {candidates.filter(c=>c.position==='Senator').map(c=> (
              <label key={c.id} className="flex items-center gap-3 p-2">
                <input type="checkbox" checked={senatorChoices.includes(c.id)} onChange={()=>toggleSenator(c.id)} disabled={sessionActive===false} />
                <div className="font-medium">{c.name}</div>
              </label>
            ))}
          </div>
          <div className="mt-2">
            <button className="btn" onClick={()=>submitPosition('Senator', senatorChoices)} disabled={sessionActive===false}>Vote Senators</button>
          </div>
        </section>

        {message && <div className="mt-4">{message}</div>}
      </div>
    </div>
  );
}
