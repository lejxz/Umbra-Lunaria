"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { WarAttackQualityPoint } from "@/lib/view-models/dashboard";
import { Badge, EmptyState } from "@/components/ui";
import { IconSwords } from "@/components/ui/icons";
import { CHART_COLORS, tooltipContentStyle } from "@/lib/chart-theme";
import {
  attackTierRows,
  summarizeAttackQuality,
  type AttackTierRow,
} from "@/lib/war/attack-quality";

/**
 * Attack quality — the star-distribution companion to the war-performance
 * panel, over the SAME wars (the row's shared window feeds both cards).
 *
 * The old all-time donut hid every number behind hover slices. This card
 * keeps the donut for shape-at-a-glance but prints the distribution as
 * tier rows — count, share, and each tier's average destruction — so the
 * story reads without a pointer: how many attacks, how clean, and how
 * close the misses were. A delta chip compares the 3★ rate against the
 * preceding window of equal size ("are attacks getting cleaner?"), and a
 * custom themed tooltip carries the per-tier detail on the slices.
 */

/** Tier palette — a quality heat scale, best → worst. */
const TIER_COLORS = {
  "3": "#34D399", // emerald-400
  "2": "#FBBF24", // amber-400
  "1": "#F87171", // red-400
  "0": "#6B6480", // chart muted
} as const;

export function WarAttackQualityCard({
  points,
  windowLabel,
  delta,
}: {
  points: WarAttackQualityPoint[];
  /** Passive label of the row's active window ("last 20 wars" / "Jul 1 – Jul 31"). */
  windowLabel: string;
  /** 3★-rate change vs the preceding window of equal size; null when
   *  there isn't enough history for a fair comparison. */
  delta: number | null;
}) {
  const summary = useMemo(() => summarizeAttackQuality(points), [points]);
  const tiers = useMemo(() => attackTierRows(points), [points]);

  if (summary.attacks === 0) {
    return (
      <section
        className="glass flex flex-col rounded-2xl p-5"
        aria-labelledby="attack-dist-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
              Attack quality
            </p>
            <h3
              id="attack-dist-title"
              className="mt-1 font-display text-lg text-umbra-lilac"
            >
              Star distribution
            </h3>
          </div>
          <Badge tone="muted">{windowLabel}</Badge>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <EmptyState
            title="No attack data in this window"
            icon={<IconSwords className="h-8 w-8" />}
          />
        </div>
      </section>
    );
  }

  const data = tiers.filter((t) => t.count > 0);

  return (
    <section
      className="glass flex flex-col rounded-2xl p-5"
      aria-labelledby="attack-dist-title"
    >
      {/* Header + passive window label (the row's picker drives both cards) */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            Attack quality
          </p>
          <h3
            id="attack-dist-title"
            className="mt-1 font-display text-lg text-umbra-lilac"
          >
            Star distribution
          </h3>
        </div>
        <Badge tone="muted">{windowLabel}</Badge>
      </div>

      {/* Donut — shape at a glance; numbers live in the tier rows below */}
      <div className="relative mt-3 h-40 sm:h-44 lg:h-auto lg:min-h-[10rem] lg:flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="88%"
              paddingAngle={2}
              dataKey="count"
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.tier} fill={TIER_COLORS[entry.tier]} />
              ))}
            </Pie>
            <Tooltip
              cursor={false}
              content={({ active, payload }) => (
                <AttackTooltip
                  active={active}
                  row={payload?.[0]?.payload as AttackTierRow | undefined}
                  total={summary.attacks}
                />
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label — the headline number */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold text-emerald-400">
            {Math.round(summary.threeStarRate ?? 0)}%
          </span>
          <span className="font-mono text-micro uppercase tracking-wider text-umbra-muted">
            3★ rate
          </span>
        </div>
      </div>

      {/* Tier rows — the distribution, readable without hovering */}
      <ul className="mt-4 space-y-1.5">
        {tiers.map((t) => (
          <li
            key={t.tier}
            className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-wider"
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: TIER_COLORS[t.tier] }}
            />
            <span className="w-4 shrink-0 text-umbra-lilac">{t.tier}★</span>
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${t.share}%`,
                  background: TIER_COLORS[t.tier],
                  opacity: 0.55,
                }}
              />
            </span>
            <span className="w-8 shrink-0 text-right text-umbra-lilac">
              {t.count}
            </span>
            <span className="w-9 shrink-0 text-right text-umbra-muted">
              {t.share}%
            </span>
          </li>
        ))}
      </ul>

      {/* Footer — the window-over-window read (3★ rate vs prior window) */}
      {delta != null && (
        <div className="mt-4 flex flex-wrap items-center justify-end border-t border-white/5 pt-3 font-mono text-[0.65rem] uppercase tracking-wider text-umbra-muted">
          <span
            className={
              delta > 0
                ? "text-emerald-400"
                : delta < 0
                  ? "text-red-400"
                  : "text-umbra-muted"
            }
          >
            3★ {delta > 0 ? "+" : ""}
            {delta}% vs prior
          </span>
        </div>
      )}
    </section>
  );
}

// ── Tooltip ────────────────────────────────────────────────────────────────

function AttackTooltip({
  active,
  row,
  total,
}: {
  active?: boolean;
  row?: AttackTierRow;
  total: number;
}) {
  if (!active || !row) return null;
  const share = total > 0 ? Math.round((row.count / total) * 100) : 0;
  return (
    <div style={tooltipContentStyle}>
      <p className="font-semibold tracking-wider" style={{ color: TIER_COLORS[row.tier] }}>
        {row.tier}★ attacks
      </p>
      <p className="mt-1" style={{ color: CHART_COLORS.muted }}>
        {row.count} of {total} · {share}%
      </p>
      <p style={{ color: CHART_COLORS.muted }}>
        Avg destruction {row.avgDestruction ?? "—"}%
      </p>
    </div>
  );
}
