import { describe, it, expect } from "vitest";
import { validateRoster, ConflictError, NotFoundError } from "@/lib/planning/roster-service";

/**
 * Tests for the roster payload validation (pure — no DB).
 *
 * Covers concept/12 Step 2.2: "Validate selected member count, unique members,
 * map positions, and allowed war sizes server-side."
 */

const VALID_SIZE = 10;
function makeSlots(tags: string[]): { playerTag: string; mapPosition: number }[] {
  return tags.map((t, i) => ({ playerTag: t, mapPosition: i + 1 }));
}

describe("validateRoster — warSize", () => {
  it("accepts all allowed sizes", () => {
    for (const size of [10, 15, 20, 25, 30, 40, 50]) {
      const r = validateRoster({ warSize: size, slots: [] }, false);
      expect(r.ok).toBe(true);
    }
  });

  it("rejects an unsupported size", () => {
    const r = validateRoster({ warSize: 12, slots: [] }, false);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.path === "warSize")).toBe(true);
  });

  it("rejects a non-integer size", () => {
    const r = validateRoster({ warSize: 10.5, slots: [] }, false);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.path === "warSize")).toBe(true);
  });
});

describe("validateRoster — slot count", () => {
  it("allows a partial draft (count < warSize) when requireFull=false", () => {
    const r = validateRoster(
      { warSize: VALID_SIZE, slots: makeSlots(["#A", "#B", "#C"]) },
      false,
    );
    expect(r.ok).toBe(true);
  });

  it("rejects too many slots", () => {
    const r = validateRoster(
      { warSize: 10, slots: makeSlots(Array.from({ length: 11 }, (_, i) => `#M${i}`)) },
      false,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.path === "slots")).toBe(true);
  });

  it("requires a full lineup when requireFull=true", () => {
    const r = validateRoster(
      { warSize: 10, slots: makeSlots(Array.from({ length: 9 }, (_, i) => `#M${i}`)) },
      true,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.path === "slots")).toBe(true);
  });

  it("accepts a full lineup when requireFull=true", () => {
    const r = validateRoster(
      { warSize: 10, slots: makeSlots(Array.from({ length: 10 }, (_, i) => `#M${i}`)) },
      true,
    );
    expect(r.ok).toBe(true);
  });
});

describe("validateRoster — unique members", () => {
  it("rejects a duplicate player tag", () => {
    const r = validateRoster(
      { warSize: 10, slots: [
        { playerTag: "#DUP", mapPosition: 1 },
        { playerTag: "#DUP", mapPosition: 2 },
      ] },
      false,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.path === "slots[1].playerTag")).toBe(true);
  });

  it("rejects an empty player tag", () => {
    const r = validateRoster(
      { warSize: 10, slots: [{ playerTag: "  ", mapPosition: 1 }] },
      false,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.path === "slots[0].playerTag")).toBe(true);
  });
});

describe("validateRoster — map positions", () => {
  it("rejects a duplicate position", () => {
    const r = validateRoster(
      { warSize: 10, slots: [
        { playerTag: "#A", mapPosition: 1 },
        { playerTag: "#B", mapPosition: 1 },
      ] },
      false,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.path === "slots[1].mapPosition")).toBe(true);
  });

  it("rejects a position out of range", () => {
    const r = validateRoster(
      { warSize: 10, slots: [{ playerTag: "#A", mapPosition: 11 }] },
      false,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.path === "slots[0].mapPosition")).toBe(true);
  });

  it("rejects position 0", () => {
    const r = validateRoster(
      { warSize: 10, slots: [{ playerTag: "#A", mapPosition: 0 }] },
      false,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.path === "slots[0].mapPosition")).toBe(true);
  });
});

describe("validateRoster — shape errors", () => {
  it("rejects a non-object root", () => {
    expect(validateRoster(null, false).ok).toBe(false);
    expect(validateRoster("string", false).ok).toBe(false);
    expect(validateRoster(42, false).ok).toBe(false);
  });

  it("rejects a non-array slots field", () => {
    const r = validateRoster({ warSize: 10, slots: "not-array" }, false);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.path === "slots")).toBe(true);
  });

  it("rejects a non-object slot entry", () => {
    const r = validateRoster({ warSize: 10, slots: ["not-object"] }, false);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.path === "slots[0]")).toBe(true);
  });
});

describe("Error classes", () => {
  it("ConflictError has the right name + message", () => {
    const e = new ConflictError("nope");
    expect(e.name).toBe("ConflictError");
    expect(e.message).toBe("nope");
    expect(e instanceof Error).toBe(true);
  });

  it("NotFoundError has the right name + message", () => {
    const e = new NotFoundError("missing");
    expect(e.name).toBe("NotFoundError");
    expect(e.message).toBe("missing");
    expect(e instanceof Error).toBe(true);
  });
});
