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
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  useEffect(()=>{
    fetch('/api/candidates').then(r=>r.json()).then(d=>{ if (d.ok && Array.isArray(d.candidates)) setCandidates(d.candidates); else if (Array.isArray(d)) setCandidates(d); }).catch(()=>{});
    fetch('/api/session').then(r=>r.json()).then(d=>{ if (d.ok) setSessionActive(d.active); }).catch(()=>{});
  }, []);

  function toggleSenator(id: string) {
    setSenatorChoices(s => s.includes(id) ? s.filter(x=>x!==id) : s.concat(id));
  }

  async function submitPosition(position: string, candidateIds: string[]) {
    // kept for backward compatibility but not used when submitting full ballot
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

  // Submit the complete ballot at once. Uses the batch endpoint which enforces
  // one-ballot-per-voter-per-session on the server.
  async function submitBallot() {
    setMessage(null);
    // client-side validation mirroring server rules
    const votes: Array<{ position: string; candidateIds: string[] }> = [];
    votes.push({ position: 'President', candidateIds: presidentChoice ? [presidentChoice] : [] });
    votes.push({ position: 'Vice President', candidateIds: vpChoice ? [vpChoice] : [] });
    votes.push({ position: 'Senator', candidateIds: senatorChoices });

    // basic validation
    if (votes[0].candidateIds.length !== 1) { setMessage('Please select exactly one President.'); return; }
    if (votes[1].candidateIds.length !== 1) { setMessage('Please select exactly one Vice President.'); return; }
    if (votes[2].candidateIds.length > 12) { setMessage('You can select up to 12 Senators.'); return; }
    if (sessionActive === false) { setMessage('Voting session is not active.'); return; }

    try {
      const res = await fetch('/api/vote/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ votes }), credentials: 'include' });
      const d = await res.json();
      if (!d.ok) { setMessage(d.error || 'Ballot submit failed'); return; }
      // show results per position
      const okAll = Array.isArray(d.results) && d.results.every((r: any) => r.ok === true);
      if (okAll) {
        setMessage('Ballot submitted successfully. Thank you for voting.');
        setTimeout(()=>router.push('/dashboard'), 1400);
      } else {
        setMessage('Partial result: ' + JSON.stringify(d.results));
      }
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
          <div className="mt-2" />
        </section>

        <section className="card mb-4">
          <h2>Vice President</h2>
          {candidates.filter(c=>c.position==='Vice President').map(c=> (
            <label key={c.id} className="flex items-center gap-3 p-2">
              <input type="radio" name="vp" checked={vpChoice===c.id} onChange={()=>setVpChoice(c.id)} disabled={sessionActive===false} />
              <div className="font-medium">{c.name}</div>
            </label>
          ))}
          <div className="mt-2" />
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
          <div className="mt-2" />
        </section>

        <div className="mt-6">
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => { if (sessionActive === false) return; setShowConfirm(true); }} disabled={sessionActive===false}>Submit Vote</button>
        </div>

        {/* Confirmation modal */}
        {showConfirm && (
          <div className="modal-overlay">
            <div className="modal card">
              <h3 className="modal-title">Confirm your ballot</h3>
              <div className="modal-body">
                <p>Please review your selections. Submitting will finalize your ballot for this session.</p>
                <div className="mt-3">
                  <strong>President:</strong> {(() => {
                    const p = candidates.find(c => c.id === presidentChoice);
                    return p ? p.name : <em>None selected</em>;
                  })()}
                </div>
                <div className="mt-2">
                  <strong>Vice President:</strong> {(() => {
                    const v = candidates.find(c => c.id === vpChoice);
                    return v ? v.name : <em>None selected</em>;
                  })()}
                </div>
                <div className="mt-2">
                  <strong>Senators:</strong>
                  <ul className="mt-1 ml-4 list-disc">
                    {senatorChoices.length === 0 && <li><em>None selected</em></li>}
                    {senatorChoices.map(id => {
                      const s = candidates.find(c => c.id === id);
                      return <li key={id}>{s ? s.name : id}</li>;
                    })}
                  </ul>
                </div>
              </div>
              <div className="modal-actions mt-4 flex gap-2">
                <button className="btn" onClick={async () => { setShowConfirm(false); await submitBallot(); }}>Confirm</button>
                <button className="bg-gray-600 text-white px-3 py-1 rounded" onClick={() => setShowConfirm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {message && <div className="mt-4">{message}</div>}
      </div>
    </div>
  );
}
