import { NextResponse } from "next/server";
import { votes, candidates } from "../../../lib/data";

export async function GET() {
  // Build tally from in-memory votes
  const map: Record<string, Record<string, number>> = {};
  for (const v of votes) {
    if (!map[v.position]) map[v.position] = {};
    for (const cid of v.candidateIds) {
      map[v.position][cid] = (map[v.position][cid] || 0) + 1;
    }
  }

  // Produce friendly result including candidate names
  const result: Record<string, Array<{ candidateId: string; name: string; count: number }>> = {};
  for (const c of candidates) {
    if (!result[c.position]) result[c.position] = [];
    result[c.position].push({ candidateId: c.id, name: c.name, count: map[c.position]?.[c.id] || 0 });
  }

  return NextResponse.json({ ok: true, tally: result });
}
