import { NextResponse } from "next/server";
import { getSession, findUserById, hasVoted, hasVotedAny, recordVote, isVotingActive } from "../../../../lib/data";
import { submitVoteOnChain } from "../../../../lib/polkadot";

function parseCookies(cookieHeader?: string | null) {
  if (!cookieHeader) return {} as Record<string, string>;
  return Object.fromEntries(cookieHeader.split(";").map((c) => {
    const [k, ...v] = c.trim().split("=");
    return [k, decodeURIComponent(v.join("="))];
  }));
}

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie");
    const cookies = parseCookies(cookieHeader);
    const token = cookies["session"];
    const userId = getSession(token);
    if (!userId) return NextResponse.json({ ok: false, error: "not authenticated" }, { status: 401 });
    const user = findUserById(userId);
    if (!user) return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 });

    const body = await req.json();
    const { votes: votesPayload } = body;
    if (!Array.isArray(votesPayload)) return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });

    const results: Array<{ position: string; ok: boolean; error?: string; txHash?: string }> = [];

    if (!isVotingActive()) {
      return NextResponse.json({ ok: false, error: "voting session is not active" }, { status: 403 });
    }

    // If the voter already submitted any vote this session, do not allow
    // submitting a new ballot. This enforces one-ballot-per-voter.
    if (hasVotedAny(userId)) {
      return NextResponse.json({ ok: false, error: 'voter has already submitted a ballot for this session' }, { status: 400 });
    }

    for (const item of votesPayload) {
      const { position, candidateIds } = item;
      if (!position || !Array.isArray(candidateIds)) {
        results.push({ position: position || 'unknown', ok: false, error: 'invalid item' });
        continue;
      }

      // enforce rules
      if ((position === "President" || position === "Vice President") && candidateIds.length > 1) {
        results.push({ position, ok: false, error: 'must select at most one for this position' });
        continue;
      }
      if (position === "Senator" && candidateIds.length > 12) {
        results.push({ position, ok: false, error: 'can select up to 12 senators' });
        continue;
      }

      if (hasVoted(userId, position)) {
        results.push({ position, ok: false, error: 'already voted for this position' });
        continue;
      }

      // submit to chain (simulated or real) and record
      const txHash = await submitVoteOnChain({ voterId: userId, position, candidateIds });
      recordVote({ voterId: userId, position, candidateIds, txHash, timestamp: Date.now() });
      results.push({ position, ok: true, txHash });
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
