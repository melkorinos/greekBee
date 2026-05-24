// matching.test.ts — unit tests for Leksindeseis pure matching functions.

import type { LeksindeseisGroup } from "@/games/leksindeseis/types";
import { describe, expect, it } from "vitest";

import { isOneAway, matchesGroup } from "@/games/leksindeseis/lib/matching";

const GROUP: LeksindeseisGroup = {
  category: "Χρώματα",
  words:    ["κόκκινο", "μπλε", "πράσινο", "κίτρινο"],
  difficulty: 1,
};

// ── matchesGroup ──────────────────────────────────────────────────────────────

describe("matchesGroup", () => {
  it("returns true for an exact match in the same order", () => {
    expect(matchesGroup(["κόκκινο", "μπλε", "πράσινο", "κίτρινο"], GROUP)).toBe(true);
  });

  it("returns true regardless of selection order", () => {
    expect(matchesGroup(["κίτρινο", "πράσινο", "μπλε", "κόκκινο"], GROUP)).toBe(true);
  });

  it("returns false when one word differs", () => {
    expect(matchesGroup(["κόκκινο", "μπλε", "πράσινο", "άσπρο"], GROUP)).toBe(false);
  });

  it("returns false when fewer than 4 words provided", () => {
    expect(matchesGroup(["κόκκινο", "μπλε", "πράσινο"], GROUP)).toBe(false);
  });

  it("returns false for a completely wrong selection", () => {
    expect(matchesGroup(["σκύλος", "γάτα", "άλογο", "ψάρι"], GROUP)).toBe(false);
  });
});

// ── isOneAway ─────────────────────────────────────────────────────────────────

describe("isOneAway", () => {
  it("returns true when exactly 3 words overlap", () => {
    expect(isOneAway(["κόκκινο", "μπλε", "πράσινο", "σκύλος"], GROUP)).toBe(true);
  });

  it("returns false when all 4 words match (that is matchesGroup territory)", () => {
    expect(isOneAway(["κόκκινο", "μπλε", "πράσινο", "κίτρινο"], GROUP)).toBe(false);
  });

  it("returns false when only 2 words overlap", () => {
    expect(isOneAway(["κόκκινο", "μπλε", "σκύλος", "γάτα"], GROUP)).toBe(false);
  });

  it("returns false when no words overlap", () => {
    expect(isOneAway(["σκύλος", "γάτα", "άλογο", "ψάρι"], GROUP)).toBe(false);
  });
});
