"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState<boolean | null>(null);

  useEffect(()=>{
    fetch('/api/candidates').then(r=>r.json()).then(d=>{ if (d.ok && Array.isArray(d.candidates)) setCandidates(d.candidates); else if (Array.isArray(d)) setCandidates(d); }).catch(()=>{});
    fetch('/api/session').then(r=>r.json()).then(d=>{ if (d.ok) setSessionActive(d.active); }).catch(()=>{});
  }, []);

  async function handleAdd(e:any){
    e.preventDefault();
    setMsg(null);
    try{
      const res = await fetch('/api/candidates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, position }), credentials: 'include' });
      const d = await res.json();
      if (!d.ok) { setMsg('Error: ' + (d.error||'unknown')); return; }
      setCandidates((s)=>[...s, d.candidate]);
      setMsg('Candidate added');
      setName(''); setPosition('');
    }catch(err:any){ setMsg(String(err)); }
  }

  async function toggleSession(){
    try{
      const res = await fetch('/api/session', { method: 'POST', credentials: 'include' });
      const d = await res.json();
      if (d.ok) setSessionActive(d.active);
    }catch(err){ setMsg(String(err)); }
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl mb-4">Admin — Manage Candidates</h1>
        <form onSubmit={handleAdd} className="mb-6">
          <div className="mb-2">
            <label className="block">Candidate name</label>
            <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full p-2 border" />
          </div>
          <div className="mb-2">
            <label className="block">Position</label>
            <select value={position} onChange={(e)=>setPosition(e.target.value)} className="w-full p-2 border">
              <option value="">Select position</option>
              <option value="President">President</option>
              <option value="Vice President">Vice President</option>
              <option value="Senator">Senator</option>
            </select>
          </div>
          <button className="bg-green-600 text-white px-3 py-1 rounded" type="submit">Add candidate</button>
        </form>

        <div className="mb-4">
          <strong>Voting session:</strong> {sessionActive ? 'Active' : 'Inactive'}
          <div className="mt-2">
            <button onClick={toggleSession} className="bg-orange-600 text-white px-3 py-1 rounded">Toggle session</button>
          </div>
        </div>

        {msg && <div className="mb-4">{msg}</div>}

        <h2 className="text-xl mb-2">Current candidates</h2>
        <div className="grid gap-2">
          {candidates.map(c=> (
            <div key={c.id} className="p-2 border rounded">
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-zinc-600">{c.position} — {c.id}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
