import { describe, it, expect } from "vitest";
import { fixtureClan, fixtureMembers, fixturePlayer } from "./clan";

// Smoke test — verifies the fixture shapes match the CoC client types and
// the test runner is wired up correctly. See concept/12 Step 1.0.A.
describe("test fixtures", () => {
  it("fixtureClan has the expected clan tag", () => {
    expect(fixtureClan.tag).toBe("#2JPCYP98L");
    expect(fixtureClan.name).toBe("Umbra Lunaria");
  });

  it("fixtureMembers are well-formed", () => {
    expect(fixtureMembers).toHaveLength(3);
    for (const m of fixtureMembers) {
      expect(m.tag).toMatch(/^#/);
      expect(typeof m.donations).toBe("number");
    }
  });

  it("fixturePlayer has progression arrays", () => {
    expect(fixturePlayer.troops.length).toBeGreaterThan(0);
    expect(fixturePlayer.heroes.length).toBeGreaterThan(0);
    expect(fixturePlayer.warPreference).toBe("in");
  });
});
