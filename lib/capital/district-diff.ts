/**
 * District upgrade-history diffing — pure logic extracted so it can be
 * unit-tested without a database (the mocked query boundary test strategy —
 * see tests/README.md). Concept/12 Step 1.5.
 *
 * `diffDistrictSnapshots` takes a sequence of (districtName, level,
 * capturedAt) rows and produces chronological upgrade events: one event per
 * observed level increase. A level decrease (data correction / API quirk) is
 * NOT treated as an upgrade and is skipped.
 *
 * Rules (concept/08 §"District upgrade history"):
 *   - With zero snapshots → no events (cold start).
 *   - With one snapshot → no events (nothing to diff against; the page shows
 *     "upgrade history will begin after the next observed change").
 *   - For each district, sort its snapshots ascending by capturedAt. For each
 *     consecutive pair where level increased, emit an event dated at the
 *     later snapshot's capturedAt.
 *
 * Pure: no DB, no React, no I/O. Inputs in, events out.
 */

export interface DistrictSnapshotRow {
  districtName: string;
  districtHallLevel: number;
  capturedAt: Date;
}

export interface DistrictUpgradeEvent {
  districtName: string;
  fromLevel: number;
  toLevel: number;
  /** When the higher level was first observed. */
  observedAt: Date;
}

/**
 * Diff a flat list of district snapshots into chronological upgrade events.
 * The input may contain multiple districts interleaved; this function groups
 * by district internally. Returns events sorted newest-first (the typical
 * timeline display order).
 */
export function diffDistrictSnapshots(
  snapshots: readonly DistrictSnapshotRow[],
): DistrictUpgradeEvent[] {
  if (snapshots.length === 0) return [];

  // Group by district.
  const byDistrict = new Map<string, DistrictSnapshotRow[]>();
  for (const s of snapshots) {
    const arr = byDistrict.get(s.districtName) ?? [];
    arr.push(s);
    byDistrict.set(s.districtName, arr);
  }

  const events: DistrictUpgradeEvent[] = [];
  for (const [district, rows] of byDistrict) {
    // Sort ascending by capturedAt so consecutive pairs are chronological.
    const sorted = [...rows].sort(
      (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime(),
    );
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (!prev || !curr) continue;
      if (curr.districtHallLevel > prev.districtHallLevel) {
        events.push({
          districtName: district,
          fromLevel: prev.districtHallLevel,
          toLevel: curr.districtHallLevel,
          observedAt: curr.capturedAt,
        });
      }
      // A level decrease or no-change pair produces no event.
    }
  }

  // Newest-first for the timeline display.
  events.sort((a, b) => b.observedAt.getTime() - a.observedAt.getTime());
  return events;
}
