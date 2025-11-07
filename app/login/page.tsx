"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [id, setId] = useState("");
  const [otp, setOtp] = useState("");
  const [debugUsers, setDebugUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // fetch debug users to show OTPs in demo mode
    fetch('/api/debug/users').then(r => r.json()).then(d => { if (d.ok) setDebugUsers(d.users); }).catch(()=>{});
  }, []);

  async function handleSubmit(e: any) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, otp }), credentials: 'include' });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      // redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(String(err));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="p-8 bg-white rounded shadow w-full max-w-md">
        <h2 className="text-2xl mb-4">Philippine Voting System — Login</h2>
        <form onSubmit={handleSubmit}>
          <label className="block mb-2">Voter ID</label>
          <input className="w-full p-2 border mb-3" value={id} onChange={(e)=>setId(e.target.value)} />
          <label className="block mb-2">One-time Password (OTP)</label>
          <input className="w-full p-2 border mb-3" value={otp} onChange={(e)=>setOtp(e.target.value)} />
          {error && <div className="text-red-600 mb-2">{error}</div>}
          <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">Login</button>
        </form>

        <div className="mt-6 text-sm text-zinc-600">
          <p>Demo accounts (OTP shown here for development/demo only):</p>
          <ul>
            {debugUsers.map((u)=> (
              <li key={u.id} className="mt-2 p-2 border rounded">
                <strong>{u.id}</strong> — {u.name} ({u.role})<br />
                OTP: <code>{u.otp}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
