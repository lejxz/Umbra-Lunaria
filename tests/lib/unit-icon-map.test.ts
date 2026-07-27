import { describe, it, expect } from "vitest";
import {
  unitIconMap,
  getUnitIcon,
} from "@/lib/assets/unit-icon-map";

/**
 * Unit icon map tests. The map resolves CoC API unit names to local Fankit
 * PNG paths under /assets/unit-icons/. Units without a downloaded asset fall
 * back to the placeholder SVG so every card renders an image — no broken
 * images, no silent text-only fallbacks.
 */
describe("unitIconMap", () => {
  it("every value is a local /assets/unit-icons/ path", () => {
    for (const [name, path] of Object.entries(unitIconMap)) {
      expect(
        path.startsWith("/assets/unit-icons/"),
        `${name} -> ${path} must be a local path under /assets/unit-icons/`,
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

  it("downloaded troop icons use the Fankit Icon_HV_/Icon_BB_ naming convention", () => {
    // Every non-placeholder entry must point at a real Fankit PNG filename
    // (Icon_HV_*.png or Icon_BB_*.png), not the old kebab-case placeholders.
    for (const [name, path] of Object.entries(unitIconMap)) {
      if (path.endsWith("placeholder.svg")) continue;
      expect(
        /^\/assets\/unit-icons\/Icon_(HV|BB)_.+\.png$/.test(path),
        `${name} -> ${path} must match the Icon_<Village>_<Name>.png convention`,
      ).toBe(true);
    }
  });
});

describe("getUnitIcon", () => {
  it("returns the placeholder path for an unmapped unit", () => {
    expect(getUnitIcon("Definitely Not A Real Unit")).toBe(
      "/assets/unit-icons/placeholder.svg",
    );
  });

  it("returns the placeholder path for an empty string", () => {
    expect(getUnitIcon("")).toBe("/assets/unit-icons/placeholder.svg");
  });

  it("returns the downloaded Fankit PNG for mapped troops", () => {
    expect(getUnitIcon("Barbarian")).toBe(
      "/assets/unit-icons/Icon_HV_Barbarian.png",
    );
    expect(getUnitIcon("Archer")).toBe(
      "/assets/unit-icons/Icon_HV_Archer.png",
    );
    expect(getUnitIcon("Hog Rider")).toBe(
      "/assets/unit-icons/Icon_HV_Hog_Rider.png",
    );
    expect(getUnitIcon("Wall Wrecker")).toBe(
      "/assets/unit-icons/Icon_HV_Siege_Machine_Wall_Wrecker.png",
    );
  });

  it("returns the placeholder for units without a downloaded asset", () => {
    // Heroes, spells, and pets haven't been downloaded from the Fankit yet.
    expect(getUnitIcon("Barbarian King")).toBe(
      "/assets/unit-icons/placeholder.svg",
    );
    expect(getUnitIcon("Lightning Spell")).toBe(
      "/assets/unit-icons/placeholder.svg",
    );
    expect(getUnitIcon("L.A.S.S.I")).toBe(
      "/assets/unit-icons/placeholder.svg",
    );
  });
});
