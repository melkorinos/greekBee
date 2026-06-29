// recipes.test.ts
// Smoke-tests for src/styles/recipes.ts (the platform-wide class recipes).
//
// Goals:
//   1. Every exported token is a non-empty string (catches accidental deletions / renames).
//   2. Key recipes contain the semantic-token / Tailwind substrings that drive the
//      visual design — so a refactor that quietly drops e.g. `rounded-full` is caught.
//   3. CONTRACT (ADR 0008): recipes carry NO `dark:` pairs — light/dark flips
//      come from the semantic tokens in globals.css, not per-class variants.
//
// Game-specific recipes (Leksokipos word chips, score bar, feedback) moved to
// src/components/leksokipos/styles.ts (ADR 0009) and are tested separately.

import { describe, expect, it } from "vitest";
import {
  // Buttons
  btnCancel,
  btnHeaderIcon,
  btnModalSubmit,
  btnPrimary,
  btnPrimaryCompact,
  btnSecondary,
  // Inputs
  inputClass,
  inputCompactClass,
  inputReadonlyClass,
  // Labels
  labelClass,
  labelOptionalClass,
  // Leaderboard
  lbRowBase,
  lbRowPlayer,
  lbTdName,
  lbTdRank,
  lbTdScore,
} from "@/styles/recipes";

// ── Helper ────────────────────────────────────────────────────────────────────

function expectNonEmpty(token: string, name: string) {
  expect(typeof token, `${name} should be a string`).toBe("string");
  expect(token.trim().length, `${name} should not be empty`).toBeGreaterThan(0);
}

const ALL_TOKENS: [string, string][] = [
  [labelClass, "labelClass"],
  [labelOptionalClass, "labelOptionalClass"],
  [inputClass, "inputClass"],
  [inputReadonlyClass, "inputReadonlyClass"],
  [inputCompactClass, "inputCompactClass"],
  [btnSecondary, "btnSecondary"],
  [btnPrimary, "btnPrimary"],
  [btnPrimaryCompact, "btnPrimaryCompact"],
  [btnCancel, "btnCancel"],
  [btnModalSubmit, "btnModalSubmit"],
  [btnHeaderIcon, "btnHeaderIcon"],
  [lbRowBase, "lbRowBase"],
  [lbRowPlayer, "lbRowPlayer"],
  [lbTdRank, "lbTdRank"],
  [lbTdName, "lbTdName"],
  [lbTdScore, "lbTdScore"],
];

// ── Completeness ──────────────────────────────────────────────────────────────

describe("recipes.ts — every token is a non-empty string", () => {
  it.each(ALL_TOKENS)("'%s' is a non-empty string (%s)", (token, name) => {
    expectNonEmpty(token, name);
  });
});

// ── Visual contract: key recipes reference the expected tokens / shapes ─────────

describe("recipes.ts — visual design contracts", () => {
  describe("button shapes", () => {
    it("btnSecondary is a pill", () => expect(btnSecondary).toContain("rounded-full"));
    it("btnPrimary is a pill", () => expect(btnPrimary).toContain("rounded-full"));
    it("btnHeaderIcon is a pill", () => expect(btnHeaderIcon).toContain("rounded-full"));
    it("btnCancel is rounded-xl", () => expect(btnCancel).toContain("rounded-xl"));
    it("btnModalSubmit is rounded-xl", () => expect(btnModalSubmit).toContain("rounded-xl"));
  });

  describe("primary buttons use the inverted fill token", () => {
    it("btnPrimary", () => expect(btnPrimary).toContain("bg-inverted"));
    it("btnPrimaryCompact", () => expect(btnPrimaryCompact).toContain("bg-inverted"));
    it("btnModalSubmit", () => expect(btnModalSubmit).toContain("bg-inverted"));
  });

  describe("interactive elements animate", () => {
    it("btnSecondary", () => expect(btnSecondary).toContain("transition-colors"));
    it("btnPrimary", () => expect(btnPrimary).toContain("transition-opacity"));
    it("btnCancel", () => expect(btnCancel).toContain("transition-colors"));
    it("btnModalSubmit", () => expect(btnModalSubmit).toContain("transition-opacity"));
  });

  describe("leaderboard player row is visually distinct", () => {
    it("lbRowPlayer has a game-accent tint", () => expect(lbRowPlayer).toContain("game-accent"));
    it("lbRowPlayer is bold", () => expect(lbRowPlayer).toContain("font-semibold"));
    it("lbTdScore is monospace", () => expect(lbTdScore).toContain("font-mono"));
    it("lbTdRank uses tabular-nums", () => expect(lbTdRank).toContain("tabular-nums"));
  });
});

// ── Token contract (ADR 0008): no recipe carries a `dark:` pair ────────────────
// Light/dark flips come from semantic tokens in globals.css, not per-class variants.

describe("recipes.ts — no dark: variants (ADR 0008)", () => {
  it.each(ALL_TOKENS)("'%s' has no dark: variant (%s)", (token) => {
    expect(token).not.toContain("dark:");
  });
});
