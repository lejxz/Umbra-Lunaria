import { describe, it, expect } from "vitest";
import {
  unitIconMap,
  getUnitIcon,
} from "@/lib/assets/unit-icon-map";

/**
 * Unit icon map — the "never fake a zero" rule for assets. See
 * `public/assets/unit-icons/README.md` §Text fallback is mandatory:
 *
 *   - `getUnitIcon(name)` MUST return `null` for any unmapped name.
 *   - All mapped paths MUST live under `/assets/unit-icons/` and be PNG.
 *
 * These tests pin the contract so a future batch import (real Fankit PNGs)
 * can replace the placeholder paths without breaking the accessor shape.
 */
describe("unitIconMap", () => {
  it("every value is a local /assets/unit-icons/*.png path", () => {
    for (const [name, path] of Object.entries(unitIconMap)) {
      expect(
        path.startsWith("/assets/unit-icons/") && path.endsWith(".png"),
        `${name} -> ${path} must be a local PNG under /assets/unit-icons/`,
      ).toBe(true);
    }
  });

  it("does not contain hotlinked URLs (copy-locally policy)", () => {
    for (const [name, path] of Object.entries(unitIconMap)) {
      expect(
        path,
        `${name} -> ${path} must not hotlink a third-party host`,
      ).not.toMatch(/^https?:\/\//);
    }
  });
});

describe("getUnitIcon", () => {
  it("returns null for an unmapped unit (never fake a path)", () => {
    expect(getUnitIcon("Definitely Not A Real Unit")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(getUnitIcon("")).toBeNull();
  });

  it("returns the mapped path for known troops", () => {
    expect(getUnitIcon("Barbarian")).toBe("/assets/unit-icons/barbarian.png");
    expect(getUnitIcon("Archer")).toBe("/assets/unit-icons/archer.png");
    expect(getUnitIcon("Dragon")).toBe("/assets/unit-icons/dragon.png");
  });

  it("returns the mapped path for all four heroes", () => {
    expect(getUnitIcon("Barbarian King")).toBe(
      "/assets/unit-icons/barbarian-king.png",
    );
    expect(getUnitIcon("Archer Queen")).toBe(
      "/assets/unit-icons/archer-queen.png",
    );
    expect(getUnitIcon("Grand Warden")).toBe(
      "/assets/unit-icons/grand-warden.png",
    );
    expect(getUnitIcon("Royal Champion")).toBe(
      "/assets/unit-icons/royal-champion.png",
    );
  });

  it("returns the mapped path for the spells mentioned in the API reference", () => {
    expect(getUnitIcon("Lightning Spell")).toBe(
      "/assets/unit-icons/lightning-spell.png",
    );
    expect(getUnitIcon("Healing Spell")).toBe(
      "/assets/unit-icons/healing-spell.png",
    );
    expect(getUnitIcon("Rage Spell")).toBe("/assets/unit-icons/rage-spell.png");
  });

  it("returns the mapped path for the pets mentioned in the API reference", () => {
    expect(getUnitIcon("L.A.S.S.I")).toBe("/assets/unit-icons/lassi.png");
    expect(getUnitIcon("Mighty Yak")).toBe(
      "/assets/unit-icons/mighty-yak.png",
    );
    expect(getUnitIcon("Electro Owl")).toBe(
      "/assets/unit-icons/electro-owl.png",
    );
  });
});
