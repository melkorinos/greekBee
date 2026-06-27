// recipes.test.ts
// Smoke-tests for src/styles/recipes.ts (the platform-wide class recipes).
//
// Goals:
//   1. Every exported token is a non-empty string (catches accidental deletions / renames).
//   2. Key recipes contain the semantic-token / Tailwind substrings that drive the
//      visual design — so a refactor that quietly drops e.g. `rounded-full` is caught.
//   3. NEW CONTRACT (ADR 0008): recipes carry NO `dark:` pairs — light/dark flips
//      come from the semantic tokens in globals.css, not per-class variants.

import { describe, expect, it } from "vitest";
import {
  // Buttons
  btnCancel,
  btnGiveUp,
  btnModalSubmit,
  btnPrimary,
  btnPrimaryCompact,
  btnSecondary,
  // Colours
  colorCenterLetter,
  colorInputPlaceholder,
  colorOuterLetter,
  colorPangramBg,
  colorPangramText,
  colorScoreBarFill,
  colorScoreBarTrack,
  colorWordChipBg,
  colorWordChipText,
  // Feedback
  feedbackAlreadySuggestedClass,
  feedbackErrorClass,
  feedbackJustSuggestedClass,
  feedbackPangramClass,
  feedbackSuggestLinkClass,
  feedbackValidClass,
  feedbackValidContainer,
  // Found words
  foundWordClass,
  foundWordPangramClass,
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
  // Score bar
  scoreBarFill,
  scoreBarTrack,
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
  [btnGiveUp, "btnGiveUp"],
  [colorCenterLetter, "colorCenterLetter"],
  [colorOuterLetter, "colorOuterLetter"],
  [colorInputPlaceholder, "colorInputPlaceholder"],
  [colorPangramBg, "colorPangramBg"],
  [colorPangramText, "colorPangramText"],
  [colorWordChipBg, "colorWordChipBg"],
  [colorWordChipText, "colorWordChipText"],
  [colorScoreBarFill, "colorScoreBarFill"],
  [colorScoreBarTrack, "colorScoreBarTrack"],
  [feedbackValidContainer, "feedbackValidContainer"],
  [feedbackPangramClass, "feedbackPangramClass"],
  [feedbackValidClass, "feedbackValidClass"],
  [feedbackErrorClass, "feedbackErrorClass"],
  [feedbackJustSuggestedClass, "feedbackJustSuggestedClass"],
  [feedbackAlreadySuggestedClass, "feedbackAlreadySuggestedClass"],
  [feedbackSuggestLinkClass, "feedbackSuggestLinkClass"],
  [foundWordClass, "foundWordClass"],
  [foundWordPangramClass, "foundWordPangramClass"],
  [scoreBarTrack, "scoreBarTrack"],
  [scoreBarFill, "scoreBarFill"],
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

  describe("colour recipes reference the expected semantic tokens", () => {
    it("center letter → accent", () => expect(colorCenterLetter).toContain("accent"));
    it("outer letter → foreground", () => expect(colorOuterLetter).toContain("foreground"));
    it("placeholder → muted", () => expect(colorInputPlaceholder).toContain("muted"));
    it("pangram bg → brand", () => expect(colorPangramBg).toContain("brand"));
    it("pangram text → accent", () => expect(colorPangramText).toContain("accent"));
    it("score bar fill → brand", () => expect(colorScoreBarFill).toContain("brand"));
    it("score bar track → border", () => expect(colorScoreBarTrack).toContain("border"));
  });

  describe("feedback recipes reference the expected tokens", () => {
    it("valid word → correct", () => expect(feedbackValidClass).toContain("correct"));
    it("error → danger", () => expect(feedbackErrorClass).toContain("danger"));
    it("pangram inherits colorPangramText", () => expect(feedbackPangramClass).toContain(colorPangramText));
    it("just-suggested → correct", () => expect(feedbackJustSuggestedClass).toContain("correct"));
    it("already-suggested → muted", () => expect(feedbackAlreadySuggestedClass).toContain("muted"));
  });

  describe("found-word chips compose colour recipes", () => {
    it("normal chip includes colorWordChipBg", () => expect(foundWordClass).toContain(colorWordChipBg));
    it("normal chip includes colorWordChipText", () => expect(foundWordClass).toContain(colorWordChipText));
    it("pangram chip includes colorPangramBg", () => expect(foundWordPangramClass).toContain(colorPangramBg));
    it("pangram chip is bold", () => expect(foundWordPangramClass).toContain("font-semibold"));
  });

  describe("score bar composes colour recipes", () => {
    it("track includes colorScoreBarTrack", () => expect(scoreBarTrack).toContain(colorScoreBarTrack));
    it("fill includes colorScoreBarFill", () => expect(scoreBarFill).toContain(colorScoreBarFill));
    it("fill has smooth transition", () => expect(scoreBarFill).toContain("transition-all"));
  });

  describe("leaderboard player row is visually distinct", () => {
    it("lbRowPlayer has a brand tint", () => expect(lbRowPlayer).toContain("brand"));
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
