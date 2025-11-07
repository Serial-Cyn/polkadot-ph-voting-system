## Philippine Voting System (prototype)

This workspace now includes a prototype Philippine voting frontend and in-memory backend that demonstrates:
- Voter login using a one-time password (OTP)
- Dashboard listing positions and a "Vote now!" flow
- Voting rules enforced: President/VP single choice, Senator up to 12 selections
- Admin panel to add candidates
- Simple in-memory session store and API routes
- A Polkadot integration stub at `lib/polkadot.ts` showing how to wire `@polkadot/api`.

Notes:
- For development you can view demo users and their OTPs at `/login` (they are exposed by a debug endpoint for convenience). Do NOT expose such an endpoint in production.
- To enable real on-chain submissions, run `npm install @polkadot/api` and implement `submitVoteOnChain` in `lib/polkadot.ts` as described in that file.

Run locally:

```powershell
npm install
npm run dev
# open http://localhost:3000/login
```

