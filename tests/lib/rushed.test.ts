import { describe, it, expect } from "vitest";
import { computeRushed } from "@/lib/scoring/rushed";

describe("computeRushed", () => {
  it("returns 0% when all units are maxed", () => {
    const result = computeRushed([
      { category: "Troops", items: [
        { name: "Barbarian", level: 13, maxLevel: 13 },
        { name: "Archer", level: 14, maxLevel: 14 },
      ]},
    ]);
    expect(result.overallPercent).toBe(0);
    expect(result.maxedUnits).toBe(2);
    expect(result.totalUnits).toBe(2);
  });

  it("returns null when no units have maxLevel", () => {
    const result = computeRushed([
      { category: "Troops", items: [
        { name: "Barbarian", level: 12, maxLevel: null },
      ]},
    ]);
    expect(result.overallPercent).toBe(null);
    expect(result.totalUnits).toBe(0);
  });

  it("calculates rushed percentage correctly", () => {
    // 2 units: one at 10/20 (50% behind), one at 15/20 (25% behind)
    // deficit = 10 + 5 = 15, max = 20 + 20 = 40
    // rushed = 15/40 * 100 = 37.5%
    const result = computeRushed([
      { category: "Troops", items: [
        { name: "Unit A", level: 10, maxLevel: 20 },
        { name: "Unit B", level: 15, maxLevel: 20 },
      ]},
    ]);
    expect(result.overallPercent).toBe(37.5);
    expect(result.maxedUnits).toBe(0);
  });

  it("handles mixed categories", () => {
    const result = computeRushed([
      { category: "Troops", items: [{ name: "A", level: 5, maxLevel: 10 }] },
      { category: "Heroes", items: [{ name: "B", level: 10, maxLevel: 10 }] },
    ]);
    // deficit = 5, max = 10 + 10 = 20, rushed = 5/20 * 100 = 25%
    expect(result.overallPercent).toBe(25);
    expect(result.maxedUnits).toBe(1);
    expect(result.totalUnits).toBe(2);
  });

  it("excludes units with maxLevel 0", () => {
    const result = computeRushed([
      { category: "Troops", items: [
        { name: "A", level: 5, maxLevel: 0 },
        { name: "B", level: 10, maxLevel: 10 },
      ]},
    ]);
    // Only B counts: deficit = 0, max = 10, rushed = 0%
    expect(result.overallPercent).toBe(0);
    expect(result.totalUnits).toBe(1);
  });

  it("category breakdown shows per-category percent", () => {
    const result = computeRushed([
      { category: "Troops", items: [{ name: "A", level: 5, maxLevel: 10 }] },
      { category: "Heroes", items: [{ name: "B", level: 10, maxLevel: 10 }] },
    ]);
    expect(result.categoryBreakdown[0]?.percent).toBe(50); // Troops: 5/10 = 50%
    expect(result.categoryBreakdown[1]?.percent).toBe(0);  // Heroes: 0/10 = 0%
  });
});
