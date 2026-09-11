import { describe, it, expect } from "vitest";
import {
  selectRetainedSnapshotIds,
  type PurgeSnapshot,
} from "@/lib/ingest/purge-retention";
import {
  calculateDonationDelta,
  calculateDonationWindow,
} from "@/lib/scoring/donations";
import { startOfDayInClanTz } from "@/lib/time/windows";

/**
 * Tests for the purge retention rule (docs/2026-09-10 assessment B-2 + §4.9).
 *
 * The purge route's intra-day pruning is the most destructive code path in
 * the app and has no DB-level test (no disposable-Postgres harness — see the
 * change log). This suite pins the RULE it implements as a pure function.
 * Day markers are CLAN-TIMEZONE days (Manila, UTC+8 — a Manila day runs
 * 16:00Z → 16:00Z), matching the display buckets from fix B-6.
 */

let nextId = 1;
function snap(
  playerTag: string,
  isoTime: string,
  donations: number,
  donationsReceived: number,
): PurgeSnapshot {
  return {
    id: nextId++,
    playerTag,
    capturedAt: new Date(isoTime),
    donations,
    donationsReceived,
  };
}

function prune(snaps: readonly PurgeSnapshot[]): PurgeSnapshot[] {
  const kept = selectRetainedSnapshotIds(snaps);
  return snaps.filter((s) => kept.has(s.id));
}

const toDonationSnaps = (
  rows: PurgeSnapshot[],
  field: "donations" | "donationsReceived",
) => rows.map((s) => ({ capturedAt: s.capturedAt, donations: s[field] }));

describe("selectRetainedSnapshotIds — retention shape", () => {
  it("keeps the chain's first row + ONE row per clan day when no reset happened", () => {
    // Manila Aug 1 = Jul 31 16:00Z → Aug 1 16:00Z; Manila Aug 2 = Aug 1 16:00Z → Aug 2 16:00Z.
    const snaps = [
      snap("#A", "2026-07-31T17:00:00Z", 10, 5), // first of chain + Manila Aug 1
      snap("#A", "2026-08-01T05:00:00Z", 20, 8), // Manila Aug 1 intra-day
      snap("#A", "2026-08-01T12:00:00Z", 30, 12), // Manila Aug 1 EOD
      snap("#A", "2026-08-01T23:00:00Z", 40, 15), // Manila Aug 2 (07:00 Manila)
      snap("#A", "2026-08-02T12:00:00Z", 50, 20), // Manila Aug 2 EOD
    ];
    const kept = prune(snaps);
    expect(kept.map((s) => s.capturedAt.toISOString())).toEqual([
      "2026-07-31T17:00:00.000Z", // chain first
      "2026-08-01T12:00:00.000Z", // Manila Aug 1 EOD
      "2026-08-02T12:00:00.000Z", // Manila Aug 2 EOD
    ]);
  });

  it("groups retention per member (members don't share day chains)", () => {
    const snaps = [
      snap("#A", "2026-07-31T17:00:00Z", 10, 0),
      snap("#A", "2026-08-01T12:00:00Z", 20, 0),
      snap("#B", "2026-07-31T17:00:00Z", 5, 5),
      snap("#B", "2026-08-01T12:00:00Z", 9, 9),
    ];
    const kept = prune(snaps);
    expect(kept).toHaveLength(4); // first + one EOD per member
  });
});

describe("selectRetainedSnapshotIds — the B-2 reset-day invariant", () => {
  it("retained chain preserves the LIFETIME donation delta across a mid-day reset", () => {
    // Manila Aug 1: counter climbs 0 → 200 by EOD. Manila Aug 2: climbs to
    // 250, reset lands, then climbs to 5 by EOD.
    const snaps = [
      // Manila Aug 1 (Jul 31 16:00Z → Aug 1 16:00Z)
      snap("#A", "2026-07-31T17:00:00Z", 0, 0), // chain first
      snap("#A", "2026-08-01T12:00:00Z", 200, 0), // Manila Aug 1 EOD
      // Manila Aug 2 (Aug 1 16:00Z → Aug 2 16:00Z)
      snap("#A", "2026-08-01T23:00:00Z", 220, 0),
      snap("#A", "2026-08-02T02:00:00Z", 250, 0), // pre-reset peak
      snap("#A", "2026-08-02T10:00:00Z", 1, 0), // first post-reset
      snap("#A", "2026-08-02T15:00:00Z", 5, 0), // Manila Aug 2 EOD
    ];

    const fullDelta = calculateDonationDelta(toDonationSnaps(snaps, "donations"));
    // Lifetime truth: 200 (day 1) + 50 (pre-reset climb) + 5 (post-reset) = 255.
    expect(fullDelta).toBe(255);

    const kept = prune(snaps);
    const keptDelta = calculateDonationDelta(toDonationSnaps(kept, "donations"));
    expect(keptDelta).toBe(fullDelta);

    // The retained chain is exactly {chain-first, day-1 EOD, pre-reset peak,
    // first post-reset, day-2 EOD} — the 220 row is redundant (the 200→250
    // climb telescopes through the peak).
    expect(kept.map((s) => s.donations)).toEqual([0, 200, 250, 1, 5]);
  });

  it("retained chain preserves donations_received across an independent reset", () => {
    const snaps = [
      snap("#A", "2026-07-31T17:00:00Z", 100, 300), // chain first + Aug 1 EOD
      // Manila Aug 2: received counter resets mid-day; given counter keeps climbing.
      snap("#A", "2026-08-01T23:00:00Z", 110, 320),
      snap("#A", "2026-08-02T02:00:00Z", 120, 350), // received peak
      snap("#A", "2026-08-02T10:00:00Z", 125, 2), // received post-drop
      snap("#A", "2026-08-02T15:00:00Z", 130, 8), // EOD
    ];

    const fullGiven = calculateDonationDelta(toDonationSnaps(snaps, "donations"));
    const fullReceived = calculateDonationDelta(toDonationSnaps(snaps, "donationsReceived"));
    expect(fullGiven).toBe(30); // 100 → 130, no reset
    expect(fullReceived).toBe(58); // 300→350 (50) + reset + 8

    const kept = prune(snaps);
    expect(calculateDonationDelta(toDonationSnaps(kept, "donations"))).toBe(fullGiven);
    expect(calculateDonationDelta(toDonationSnaps(kept, "donationsReceived"))).toBe(fullReceived);
  });

  it("randomized fuzz: retained chain preserves every app-representative window", () => {
    // Deterministic pseudo-random chains with resets. The invariant must hold
    // for any sequence, not just hand-picked ones. Windows mirror the three
    // query shapes the app actually issues:
    //   (a) whole-chain (lifetime totals / checkpoint columns),
    //   (b) per-clan-day buckets (donation timeline),
    //   (c) rolling windows anchored at a clan midnight ending "now".
    let seed = 20260911;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (let trial = 0; trial < 300; trial++) {
      const snaps: PurgeSnapshot[] = [];
      let given = 0;
      let received = 0;
      for (let day = 0; day < 6; day++) {
        const polls = 3 + Math.floor(rand() * 8); // 3..10 polls per day
        for (let p = 0; p < polls; p++) {
          // Resets: ~20% chance per counter per poll, including back-to-back.
          if (rand() < 0.2) given = 0;
          if (rand() < 0.2) received = 0;
          given += Math.floor(rand() * 30);
          received += Math.floor(rand() * 30);
          // Polls anywhere in the 24h UTC day (clan-day boundaries at 16:00Z
          // cut mid-chain — resets across them must still be preserved).
          const hour = Math.floor(rand() * 24);
          const minute = Math.floor(rand() * 60);
          snaps.push(
            snap(
              "#F",
              new Date(Date.UTC(2026, 7, 1 + day, hour, minute, 0)).toISOString(),
              given,
              received,
            ),
          );
        }
      }
      snaps.sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());

      const kept = prune(snaps);

      for (const field of ["donations", "donationsReceived"] as const) {
        // (a) Whole-chain / lifetime invariant — exact since the chain's
        // first row is retained.
        expect(calculateDonationDelta(toDonationSnaps(kept, field))).toBe(
          calculateDonationDelta(toDonationSnaps(snaps, field)),
        );

        // (b) Per-clan-day windows (the donation-timeline bucket shape).
        const lastTime = snaps[snaps.length - 1]!.capturedAt.getTime();
        for (
          let d = startOfDayInClanTz(snaps[0]!.capturedAt);
          d.getTime() <= lastTime;
          d = new Date(d.getTime() + 86_400_000)
        ) {
          const window = {
            from: d,
            to: new Date(d.getTime() + 86_400_000),
          };
          expect(
            calculateDonationWindow(toDonationSnaps(kept, field), window),
          ).toBe(
            calculateDonationWindow(toDonationSnaps(snaps, field), window),
          );
        }

        // (c) Rolling windows: anchored at each clan midnight, ending at the
        // most recent snapshot ("now").
        const now = { from: new Date(0), to: snaps[snaps.length - 1]!.capturedAt };
        for (
          let d = startOfDayInClanTz(snaps[0]!.capturedAt);
          d.getTime() <= lastTime;
          d = new Date(d.getTime() + 86_400_000)
        ) {
          const window = { from: d, to: now.to };
          expect(
            calculateDonationWindow(toDonationSnaps(kept, field), window),
          ).toBe(
            calculateDonationWindow(toDonationSnaps(snaps, field), window),
          );
        }
      }
    }
  });
});
