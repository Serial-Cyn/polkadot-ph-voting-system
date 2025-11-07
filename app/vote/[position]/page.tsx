"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function VotePositionPage() {
  const params = useParams();
  const rawPosition = params?.position;
  const posStr = Array.isArray(rawPosition) ? rawPosition[0] : rawPosition ?? "";
  const position = posStr ? decodeURIComponent(posStr) : "";
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  useEffect(()=>{
    fetch('/api/candidates').then(r=>r.json()).then(d=>{ if (d.ok && Array.isArray(d.candidates)) setCandidates(d.candidates.filter((c:any)=>c.position===position)); else if (Array.isArray(d)) setCandidates(d.filter((c:any)=>c.position===position)); }).catch(()=>{});
  }, [position]);

  const isSenator = position === 'Senator';
  const maxSenators = 12;

  function toggleCheckbox(id: string) {
    setError(null);
    setSuccess(null);
    setSelected((s) => {
      if (s.includes(id)) return s.filter(x => x !== id);
      if (isSenator && s.length >= maxSenators) {
        setError(`You can select up to ${maxSenators} senators.`);
        return s;
      }
      return [...s, id];
    });
  }

  function selectRadio(id: string) {
    setSelected([id]);
  }

  async function submitVotes(e: any) {
    e.preventDefault();
    setError(null);
    if ((position === 'President' || position === 'Vice President') && selected.length !== 1) {
      setError('You must select exactly one candidate.');
      return;
    }
    if (position === 'Senator' && selected.length > maxSenators) {
      setError(`You can select up to ${maxSenators} senators.`);
      return;
    }

    try {
      const res = await fetch('/api/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position, candidateIds: selected }), credentials: 'include' });
      const d = await res.json();
      if (!d.ok) {
        setError(d.error || 'Vote failed');
        return;
      }
      setSuccess('Vote recorded. TX: ' + (d.txHash || 'n/a'));
      setTimeout(()=>router.push('/dashboard'), 1500);
    } catch (err:any) {
      setError(String(err));
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl mb-4">Vote — {position}</h1>
        <form onSubmit={submitVotes}>
          <div className="grid gap-3">
            {candidates.map(c=> (
              <label key={c.id} className="p-3 border rounded flex items-center gap-3">
                {isSenator ? (
                  <input type="checkbox" checked={selected.includes(c.id)} onChange={()=>toggleCheckbox(c.id)} />
                ) : (
                  <input type="radio" name="choice" checked={selected.includes(c.id)} onChange={()=>selectRadio(c.id)} />
                )}
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-zinc-600">{c.id}</div>
                </div>
              </label>
            ))}
          </div>
          {error && <div className="text-red-600 mt-3">{error}</div>}
          {success && <div className="text-green-600 mt-3">{success}</div>}
          <div className="mt-4">
            <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">Submit vote</button>
          </div>
        </form>
      </div>
    </div>
  );
}
