# Philippine Voting System — Polkadot / EVM prototype

This repository is a prototype web application demonstrating a Philippine voting workflow built on modern web stacks and integrating blockchain concepts (Polkadot / EVM). It's a developer-focused proof-of-concept meant to show how wallet-based authentication, signed sessions, and on-chain vote recording can be combined with a simple admin/voter UI.

Important: this project is a demonstration and uses in-memory storage for votes and users. Do NOT use it for a real election without a security review, production-grade persistence, audited smart contracts, and strict key management.

## Goals
- Provide a simple voter/admin experience: wallet-based login, dashboard, and a one-time ballot submission per voter per session.
- Demonstrate how blockchain can be used to improve election transparency, auditability, and verifiability.
- Offer a starting point for integrating Substrate/Polkadot or EVM smart contracts with a Next.js frontend.

## Why use blockchain for voting (benefits for Filipinos)
- Transparency & auditability: When votes or vote receipts are anchored on a tamper-evident ledger, independent auditors can verify tallies without relying solely on a central authority.
- Immutability: Properly designed on-chain records are tamper-resistant, making post-election manipulation more difficult.
- Verifiable counts: Publicly auditable election data can increase trust in results if privacy-preserving methods are used correctly.
- Resilience: Decentralized or multi-provider architectures reduce single points of failure compared with a single central server.

Note: blockchain does not solve every problem (voter coercion, client device compromises, identity proofing) — it should be combined with sound procedural controls and privacy-preserving cryptographic designs.

## Features (prototype)
- Wallet-based login (EVM wallets like MetaMask / Coinbase, and Polkadot flows planned/stubbed). The app sends the wallet address to the server and issues a signed session token.
- Admin role for adding candidates and toggling an active voting session (configured via environment variables for the prototype).
- Single-ballot flow: voters select choices for President, Vice President, and up to 12 Senators, then submit the entire ballot once per active session.
- Server-side enforcement: the backend enforces Philippine-style rules (1 President, 1 VP, up to 12 Senators) and prevents multiple submissions per session.
- Solidity contract stub in `contracts/` to illustrate on-chain vote recording (EVM path) and a Polkadot/Ethers integration stub in `lib/polkadot.ts` for demo purposes.

## Local development

Requirements
- Node.js (v16+ recommended). The project was developed with Next.js — use your environment's Node LTS.
- A browser with MetaMask (or Coinbase wallet) for EVM wallet flows.

Quick start (PowerShell example)

1. Install dependencies

```powershell
npm install
```

2. Configure environment (development)

Create a `.env.local` file in the project root to store development-only secrets. Example entries:

```text
# Admin account (option 1) - public address of admin
ADMIN_ADDRESS=0xf6d9d641994550600f652552022aa9097855edee

# Alternatively provide a private key for the server to derive an admin address (development only)
# ADMIN_PRIVATE_KEY=0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Session HMAC secret (optional - used for signed stateless session tokens)
SESSION_SECRET=replace_with_a_random_secret

# Optional EVM provider & contract (if you want on-chain submit simulation)
# CONTRACT_PROVIDER_URL=https://rpc.your-chain.example
# CONTRACT_ADDRESS=0x...

```

Important: never commit private keys or secrets into source control. Use `.env.local` (ignored by git) or a secrets manager.

3. Start the dev server

```powershell
npm run dev
```

4. Open the app

Visit http://localhost:3000 in your browser. Connect a wallet on the login page and try the flow:
- Connect wallet → Dashboard → Vote now! → Select candidates → Submit Vote (confirm) → Dashboard.

## Server behavior & API overview
- `POST /api/auth` — accepts `{ walletAddress, provider }` to create a session cookie. The server issues a signed session token (stateless) and sets it as a cookie.
- `GET /api/me` — returns the user object for the session cookie.
- `GET /api/candidates` — public list of candidates.
- `POST /api/vote/batch` — submit the entire ballot (positions + selections). The server enforces voting rules and one-ballot-per-session.
- `POST /api/session` — admin-only toggle to start/stop the voting session.

## Notes about blockchain integration
- This prototype contains a Solidity contract stub in `contracts/Voting.sol`. To actually store votes on-chain you must:
	- Deploy a vetted/ audited smart contract to a testnet/mainnet.
	- Wire `lib/polkadot.ts` or a new integration module to call the contract with a funded signer.
	- Ensure privacy-preserving mechanisms (e.g., zero-knowledge, mixing, or off-chain secrets) as required — on-chain public votes are not private.

## Security & production warnings
- Do not use the in-memory stores in `lib/data.ts` for production. Replace them with a persistent, transactional database and secure session store.
- Do not store or commit private keys in the repo. Use secure key management / HSMs for signer keys.
- This prototype is not audited. Any on-chain contracts must be audited and tested thoroughly prior to use in a real election.

## Extending to Polkadot (next steps)
- Integrate `@polkadot/api` and the Polkadot extension for substrate-native signing flows.
- Design a privacy-preserving on-chain schema (or use off-chain commitments) before writing votes to a public ledger.

## Contributing
- This project is experimental. If you'd like to help, open issues or PRs with small, focused improvements (tests, persistence, and robust wallet flows are high value).

---

Authors

- Christian Mamplata
- Alecz Francois Reyes

