import { NextRequest, NextResponse } from "next/server";
import { and, eq, lt, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { members, memberSnapshots, unitLevels } from "@/lib/db/schema";

/**
 * GET /api/cron/purge
 * Triggered by Vercel Cron once a day (vercel.json). Hard-deletes members
 * whose purge_at has passed and their dependent rows. See the retention
 * policy in concept/03-data-model-and-database.md.
 *
 * war_attacks rows are intentionally left untouched here — they keep the
 * war outcome with the tag intact rather than being deleted, per the
 * "anonymize, don't erase the war record" note in that doc. A full
 * anonymization pass (hashing the tag on those rows) is a Phase 1+ addition,
 * not required for Phase 0 to function.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const toPurge = await db
    .select({ playerTag: members.playerTag })
    .from(members)
    .where(and(isNotNull(members.purgeAt), lt(members.purgeAt, now)));

  for (const { playerTag } of toPurge) {
    await db.delete(memberSnapshots).where(eq(memberSnapshots.playerTag, playerTag));
    await db.delete(unitLevels).where(eq(unitLevels.playerTag, playerTag));
    await db.delete(members).where(eq(members.playerTag, playerTag));
  }

  return NextResponse.json({ ok: true, purged: toPurge.length });
}
