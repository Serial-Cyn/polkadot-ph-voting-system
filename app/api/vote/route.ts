import { NextResponse } from "next/server";
import { getSession, findUserById, hasVoted, hasVotedAny, recordVote, isVotingActive } from "../../../lib/data";
import { submitVoteOnChain } from "../../../lib/polkadot";

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
    const { position, candidateIds } = body;
    if (!position || !Array.isArray(candidateIds)) return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });

    // enforce voting session active
    if (!isVotingActive()) {
      return NextResponse.json({ ok: false, error: "voting session is not active" }, { status: 403 });
    }

    // enforce Philippine rules: President/VicePresident single choice, Senator up to 12
    if ((position === "President" || position === "Vice President") && candidateIds.length !== 1) {
      return NextResponse.json({ ok: false, error: "must select exactly one candidate" }, { status: 400 });
    }
    if (position === "Senator" && candidateIds.length > 12) {
      return NextResponse.json({ ok: false, error: "can select up to 12 senators" }, { status: 400 });
    }

    // Enforce one-ballot-per-voter-per-session: if user already submitted
    // any vote, block further voting for the session.
    if (hasVotedAny(userId)) {
      return NextResponse.json({ ok: false, error: "voter has already submitted a ballot for this session" }, { status: 400 });
    }

    if (hasVoted(userId, position)) {
      // older per-position check (shouldn't be hit if hasVotedAny is used)
      return NextResponse.json({ ok: false, error: "already voted for this position" }, { status: 400 });
    }

    // simulate sending to chain (or call real integration)
    const txHash = await submitVoteOnChain({ voterId: userId, position, candidateIds });

    recordVote({ voterId: userId, position, candidateIds, txHash, timestamp: Date.now() });

    return NextResponse.json({ ok: true, txHash });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
