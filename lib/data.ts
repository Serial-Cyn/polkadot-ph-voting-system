// In-memory stores and helpers for the prototype voting system.
// NOTE: This is a proof-of-concept only. For production, use a persistent DB
// and secure secret management.

// Use Web Crypto API (available in Edge runtime / browsers) instead of Node's crypto

function randomBytesHex(bytes: number) {
  if (typeof globalThis?.crypto?.getRandomValues === "function") {
    const arr = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(arr);
    return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback (not cryptographically secure)
  let s = "";
  for (let i = 0; i < bytes; i++) {
    s += Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
  }
  return s;
}

type Role = "voter" | "admin";

export type User = {
  id: string; // voter's id
  name: string;
  role: Role;
  otp: string; // one-time password
};

export type Candidate = {
  id: string;
  name: string;
  position: string; // e.g., President, Vice President, Senator
};

export type VoteRecord = {
  voterId: string;
  position: string;
  candidateIds: string[]; // selected candidate ids
  txHash?: string; // polkadot tx hash (simulated)
  timestamp: number;
};

// In-memory data -- initialized with a few dummy accounts and some sample
// candidates. OTPs are randomly generated (10+ chars) per requirement.

const makeOtp = (len = 12) => randomBytesHex(Math.ceil(len / 2)).slice(0, len);

export const users: User[] = [
  { id: "voter01", name: "Juan Dela Cruz", role: "voter", otp: makeOtp(12) },
  { id: "voter02", name: "Maria Santos", role: "voter", otp: makeOtp(12) },
  // Admin account (separate role)
  { id: "admin01", name: "Election Admin", role: "admin", otp: makeOtp(14) },
];

export const candidates: Candidate[] = [
  { id: "c_pres_1", name: "Ferdinand (Ferdie) Reyes", position: "President" },
  { id: "c_pres_2", name: "Liza Morales", position: "President" },
  { id: "c_vp_1", name: "Carlos (Carly) Dizon", position: "Vice President" },
  { id: "c_vp_2", name: "Ana Santos", position: "Vice President" },
  // Several senate candidates
  { id: "c_sen_1", name: "Josefa (Jo) Cruz", position: "Senator" },
  { id: "c_sen_2", name: "Emilio Navarro", position: "Senator" },
  { id: "c_sen_3", name: "Marilyn Reyes", position: "Senator" },
  { id: "c_sen_4", name: "Ramon Bautista", position: "Senator" },
  { id: "c_sen_5", name: "Cristina Velasquez", position: "Senator" },
  { id: "c_sen_6", name: "Hector Lim", position: "Senator" },
  { id: "c_sen_7", name: "Isabel Navarro", position: "Senator" },
  { id: "c_sen_8", name: "Antonio Delgado", position: "Senator" },
  { id: "c_sen_9", name: "Rosa Mendoza", position: "Senator" },
  { id: "c_sen_10", name: "Victor Santos", position: "Senator" },
  { id: "c_sen_11", name: "Lucia Fernandez", position: "Senator" },
  { id: "c_sen_12", name: "Enrique Flores", position: "Senator" }
];

export const votes: VoteRecord[] = [];

// Voting session flag (admin can turn on/off)
export let votingSessionActive = false;

export function setVotingSession(active: boolean) {
  votingSessionActive = active;
}

export function isVotingActive() {
  return votingSessionActive;
}

// Simple session store: maps session token to user id. Tokens are random hex.
export const sessions: Record<string, { userId: string; expires: number }> = {};

export function createSession(userId: string, ttlMs = 1000 * 60 * 60 * 8) {
  const token = randomBytesHex(32);
  sessions[token] = { userId, expires: Date.now() + ttlMs };
  return token;
}

export function getSession(token?: string) {
  if (!token) return null;
  // If the token matches an in-memory session, return it.
  const s = sessions[token];
  if (s) {
    if (s.expires < Date.now()) {
      delete sessions[token];
      return null;
    }
    return s.userId;
  }

  // Try verifying a signed session token (stateless)
  try {
    // lazy require to avoid adding crypto to edge runtimes
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { verifySession } = require('./session');
    const payload = verifySession(token);
    if (payload && payload.userId) return payload.userId;
  } catch (e) {
    // ignore
  }

  // Fallback: treat cookie value as userId directly (prototype only)
  if (typeof token === 'string') {
    const u = findUserById(token);
    if (u) return u.id;
  }
  return null;
}

export function findUserById(id: string) {
  return users.find((u) => u.id === id) || null;
}

export function validateOtp(id: string, otp: string) {
  const u = findUserById(id);
  if (!u) return false;
  // OTP is one-time: if matches, consume/replace it with a new one.
  if (typeof otp === 'string' && u.otp === otp.trim()) {
    u.otp = makeOtp(12);
    return true;
  }
  return false;
}

export function addCandidate(c: { name: string; position: string }) {
  const id = `${c.position.slice(0, 4).toLowerCase()}_${randomBytesHex(4)}`;
  const cand: Candidate = { id, name: c.name, position: c.position };
  candidates.push(cand);
  return cand;
}

export function recordVote(r: VoteRecord) {
  votes.push(r);
}

export function hasVoted(voterId: string, position: string) {
  return votes.some((v) => v.voterId === voterId && v.position === position);
}

// Has the voter submitted any vote in this session (any position)?
export function hasVotedAny(voterId: string) {
  return votes.some((v) => v.voterId === voterId);
}

export function listCandidatesByPosition(position: string) {
  return candidates.filter((c) => c.position === position);
}

export function listPositions() {
  // Return distinct positions from candidates list in a specific order
  const preferred = ["President", "Vice President", "Senator"];
  const found = Array.from(new Set(candidates.map((c) => c.position)));
  return preferred.filter((p) => found.includes(p)).concat(found.filter((p) => !preferred.includes(p)));
}
