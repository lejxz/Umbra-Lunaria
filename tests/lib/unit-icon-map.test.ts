import { describe, it, expect } from "vitest";
import {
  unitIconMap,
  getUnitIcon,
} from "@/lib/assets/unit-icon-map";

/**
 * Unit icon map tests. The map returns a placeholder SVG for unmapped units
 * so every card renders an image — no broken images, no text-only fallbacks.
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

  // Currently all units return the placeholder because real Fankit PNGs
  // haven't been downloaded yet. When they are, update getUnitIcon() to
  // use the map and re-enable these tests.
  it("returns the placeholder for known troops (until real icons are added)", () => {
    expect(getUnitIcon("Barbarian")).toBe("/assets/unit-icons/placeholder.svg");
    expect(getUnitIcon("Archer")).toBe("/assets/unit-icons/placeholder.svg");
  });
});
