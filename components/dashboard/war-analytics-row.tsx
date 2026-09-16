"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  WarPerformancePoint,
  WarAttackQualityPoint,
  CustomAnalyticsView,
} from "@/lib/view-models/dashboard";
import { WindowPicker, formatRange } from "@/components/ui";
import { threeStarRateDelta } from "@/lib/war/attack-quality";
import { WarPerformancePanel } from "./war-performance";
import { WarAttackQualityCard } from "./war-attack-quality";

/**
 * War analytics row — war performance (2/3) + attack quality (1/3) over ONE
 * shared war window.
 *
 * Both cards describe the same wars: the performance panel traces each war's
 * star efficiency, the attack-quality card distributes the attacks inside
 * them. One WindowPicker — sitting in the wide card's header, the same spot
 * every other card's filter occupies — drives both, and a custom range is
 * one /api/analytics request feeding both datasets. The narrow card shows a
 * passive window label instead of a second control: one row, one window, no
 * duplicated pickers fighting for space.
 *
 * Windows slice client-side from the precomputed trends (10 / 20 / all —
 * zero fetches on tab switches), mirroring the donation and membership
 * panels' pattern.
 */

type WarWindow = "10" | "20" | "all";

type CustomState =
  | { status: "idle" }
  | { status: "loading"; from: string; to: string }
  | { status: "ready"; data: CustomAnalyticsView }
  | { status: "error"; message: string };

export function WarAnalyticsRow({
  performance,
  attackQuality,
}: {
  /** All ended own-clan wars with result data, oldest-first. */
  performance: WarPerformancePoint[];
  /** All ended own-clan wars with attack detail, oldest-first. */
  attackQuality: WarAttackQualityPoint[];
}) {
  const [window, setWindow] = useState<WarWindow>("20");
  const [custom, setCustom] = useState<CustomState>({ status: "idle" });

  const applyRange = useCallback(async (from: string, to: string) => {
    if (!from || !to) return;
    setCustom({ status: "loading", from, to });
    try {
      const res = await fetch(
        `/api/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      const body = (await res.json()) as CustomAnalyticsView | { error: string };
      if (!res.ok || "error" in body) {
        setCustom({
          status: "error",
          message: "error" in body ? body.error : `Request failed (${res.status})`,
        });
        return;
      }
      setCustom({ status: "ready", data: body });
    } catch {
      setCustom({ status: "error", message: "Network error — try again." });
    }
  }, []);

  const clearCustom = useCallback(() => {
    setCustom({ status: "idle" });
  }, []);

  const isCustomActive =
    custom.status === "ready" || custom.status === "loading";

  // Preset slices — points arrive oldest-first, so the last N are the most
  // recent N. A custom range swaps both datasets (JSON Dates → real Dates).
  const presetPerformance = useMemo(
    () => (window === "all" ? performance : performance.slice(-Number(window))),
    [performance, window],
  );
  const presetAttacks = useMemo(
    () =>
      window === "all" ? attackQuality : attackQuality.slice(-Number(window)),
    [attackQuality, window],
  );
  const customPerformance = useMemo(() => {
    if (custom.status !== "ready") return null;
    return custom.data.warPerformanceTrend.points.map((p) => ({
      ...p,
      endTime: new Date(p.endTime),
    }));
  }, [custom]);
  const customAttacks = useMemo(() => {
    if (custom.status !== "ready") return null;
    return custom.data.warAttackQuality.points.map((p) => ({
      ...p,
      endTime: new Date(p.endTime),
    }));
  }, [custom]);
  const activePerformance = customPerformance ?? presetPerformance;
  const activeAttacks = customAttacks ?? presetAttacks;

  // 3★-rate delta vs the preceding window of equal size — only fair for
  // count-based presets ("all" has no predecessor, custom ranges would need
  // a second fetch for their "before").
  const delta = useMemo(
    () =>
      window === "all" ? null : threeStarRateDelta(attackQuality, Number(window)),
    [attackQuality, window],
  );

  const customFrom =
    custom.status === "ready"
      ? custom.data.from
      : custom.status === "loading"
        ? custom.from
        : undefined;
  const customTo =
    custom.status === "ready"
      ? custom.data.to
      : custom.status === "loading"
        ? custom.to
        : undefined;

  const windowLabel = isCustomActive
    ? customFrom && customTo
      ? formatRange(customFrom, customTo)
      : "custom range"
    : window === "all"
      ? "all wars"
      : `last ${window} wars`;

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <WarPerformancePanel
          points={activePerformance}
          hasCustomRange={custom.status === "ready"}
          headerControl={
            <WindowPicker
              presets={[
                { value: "10", label: "10" },
                { value: "20", label: "20" },
                { value: "all", label: "all" },
              ]}
              activePreset={isCustomActive ? null : window}
              onPresetChange={(v) => {
                setWindow(v as WarWindow);
                clearCustom();
              }}
              custom={{
                status: custom.status,
                from: customFrom,
                to: customTo,
                error: custom.status === "error" ? custom.message : null,
              }}
              onApplyCustom={applyRange}
              onClearCustom={clearCustom}
              label="War analytics window"
            />
          }
        />
      </div>
      <WarAttackQualityCard
        points={activeAttacks}
        windowLabel={windowLabel}
        delta={delta}
      />
    </div>
  );
}
