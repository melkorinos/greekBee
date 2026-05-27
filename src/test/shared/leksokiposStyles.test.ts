// leksokiposStyles.test.ts
// Smoke-tests for src/components/leksokipos/styles.ts.
//
// Goals:
//   1. Every exported token is a non-empty string (catches accidental deletions / renames).
//   2. Key tokens contain the Tailwind substrings that drive the visual design — so a
//      refactor that quietly removes e.g. `rounded-full` from all buttons is caught here
//      before it becomes a visual regression in production.

import { describe, expect, it } from "vitest";
import {
  // Form
  btnCancel,
  btnModalSubmit,
  btnPrimary,
  btnPrimaryCompact,
  btnSecondary,
  // Colors
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
  // Give-up
  btnGiveUp,
} from "@/components/leksokipos/styles";

// ── Helper ────────────────────────────────────────────────────────────────────

/** Every export must be a non-empty string — catches accidental undefined exports. */
function expectNonEmpty(token: string, name: string) {
  expect(typeof token, `${name} should be a string`).toBe("string");
  expect(token.trim().length, `${name} should not be empty`).toBeGreaterThan(0);
}

// ── Completeness: every token is a non-empty string ───────────────────────────

describe("styles.ts — every token is a non-empty string", () => {
  const tokens: [string, string][] = [
    [labelClass,                   "labelClass"],
    [labelOptionalClass,           "labelOptionalClass"],
    [inputClass,                   "inputClass"],
    [inputReadonlyClass,           "inputReadonlyClass"],
    [inputCompactClass,            "inputCompactClass"],
    [btnSecondary,                 "btnSecondary"],
    [btnPrimary,                   "btnPrimary"],
    [btnPrimaryCompact,            "btnPrimaryCompact"],
    [btnCancel,                    "btnCancel"],
    [btnModalSubmit,               "btnModalSubmit"],
    [colorCenterLetter,            "colorCenterLetter"],
    [colorOuterLetter,             "colorOuterLetter"],
    [colorInputPlaceholder,        "colorInputPlaceholder"],
    [colorPangramBg,               "colorPangramBg"],
    [colorPangramText,             "colorPangramText"],
    [colorWordChipBg,              "colorWordChipBg"],
    [colorWordChipText,            "colorWordChipText"],
    [colorScoreBarFill,            "colorScoreBarFill"],
    [colorScoreBarTrack,           "colorScoreBarTrack"],
    [feedbackValidContainer,       "feedbackValidContainer"],
    [feedbackPangramClass,         "feedbackPangramClass"],
    [feedbackValidClass,           "feedbackValidClass"],
    [feedbackErrorClass,           "feedbackErrorClass"],
    [feedbackJustSuggestedClass,   "feedbackJustSuggestedClass"],
    [feedbackAlreadySuggestedClass,"feedbackAlreadySuggestedClass"],
    [feedbackSuggestLinkClass,     "feedbackSuggestLinkClass"],
    [foundWordClass,               "foundWordClass"],
    [foundWordPangramClass,        "foundWordPangramClass"],
    [scoreBarTrack,                "scoreBarTrack"],
    [scoreBarFill,                 "scoreBarFill"],
    [lbRowBase,                    "lbRowBase"],
    [lbRowPlayer,                  "lbRowPlayer"],
    [lbTdRank,                     "lbTdRank"],
    [lbTdName,                     "lbTdName"],
    [lbTdScore,                    "lbTdScore"],
    [btnGiveUp,                    "btnGiveUp"],
  ];

  it.each(tokens)("'%s' is a non-empty string (%s)", (token, name) => {
    expectNonEmpty(token, name);
  });
});

// ── Visual contract: key tokens contain expected Tailwind substrings ───────────

describe("styles.ts — visual design contracts", () => {
  describe("buttons share rounded-full pill shape", () => {
    it("btnSecondary is a pill", () => expect(btnSecondary).toContain("rounded-full"));
    it("btnPrimary is a pill",   () => expect(btnPrimary).toContain("rounded-full"));
  });

  describe("modal buttons share rounded-xl shape", () => {
    it("btnCancel is rounded-xl",      () => expect(btnCancel).toContain("rounded-xl"));
    it("btnModalSubmit is rounded-xl", () => expect(btnModalSubmit).toContain("rounded-xl"));
  });

  describe("primary buttons use stone-800 background", () => {
    it("btnPrimary",        () => expect(btnPrimary).toContain("bg-stone-800"));
    it("btnPrimaryCompact", () => expect(btnPrimaryCompact).toContain("bg-stone-800"));
    it("btnModalSubmit",    () => expect(btnModalSubmit).toContain("bg-stone-800"));
  });

  describe("all interactive elements have transition-colors", () => {
    it("btnSecondary",   () => expect(btnSecondary).toContain("transition-colors"));
    it("btnPrimary",     () => expect(btnPrimary).toContain("transition-colors"));
    it("btnCancel",      () => expect(btnCancel).toContain("transition-colors"));
    it("btnModalSubmit", () => expect(btnModalSubmit).toContain("transition-colors"));
  });

  describe("colour tokens use expected Tailwind classes", () => {
    it("center letter is yellow-500",     () => expect(colorCenterLetter).toContain("yellow-500"));
    it("outer letter is stone-800",       () => expect(colorOuterLetter).toContain("stone-800"));
    it("placeholder is stone-300",        () => expect(colorInputPlaceholder).toContain("stone-300"));
    it("pangram bg is yellow-300",        () => expect(colorPangramBg).toContain("yellow-300"));
    it("pangram text is yellow-600",      () => expect(colorPangramText).toContain("yellow-600"));
    it("score bar fill is yellow-400",    () => expect(colorScoreBarFill).toContain("yellow-400"));
    it("score bar track is stone-200",    () => expect(colorScoreBarTrack).toContain("stone-200"));
  });

  describe("feedback tokens have correct text colours", () => {
    it("valid word is green-600",         () => expect(feedbackValidClass).toContain("green-600"));
    it("error is red-500",                () => expect(feedbackErrorClass).toContain("red-500"));
    it("pangram inherits colorPangramText", () => expect(feedbackPangramClass).toContain(colorPangramText));
    it("just-suggested is green-600",    () => expect(feedbackJustSuggestedClass).toContain("green-600"));
    it("already-suggested is stone-400", () => expect(feedbackAlreadySuggestedClass).toContain("stone-400"));
  });

  describe("found-word chips compose colour tokens", () => {
    it("normal chip includes colorWordChipBg",      () => expect(foundWordClass).toContain(colorWordChipBg));
    it("normal chip includes colorWordChipText",    () => expect(foundWordClass).toContain(colorWordChipText));
    it("pangram chip includes colorPangramBg",      () => expect(foundWordPangramClass).toContain(colorPangramBg));
    it("pangram chip includes font-semibold",       () => expect(foundWordPangramClass).toContain("font-semibold"));
  });

  describe("score bar composes colour tokens", () => {
    it("track includes colorScoreBarTrack", () => expect(scoreBarTrack).toContain(colorScoreBarTrack));
    it("fill includes colorScoreBarFill",   () => expect(scoreBarFill).toContain(colorScoreBarFill));
    it("fill has smooth transition",        () => expect(scoreBarFill).toContain("transition-all"));
  });

  describe("leaderboard player row is visually distinct", () => {
    it("lbRowPlayer has amber background", () => expect(lbRowPlayer).toContain("amber-50"));
    it("lbRowPlayer is bold",             () => expect(lbRowPlayer).toContain("font-semibold"));
    it("lbTdScore is monospace",          () => expect(lbTdScore).toContain("font-mono"));
    it("lbTdRank uses tabular-nums",      () => expect(lbTdRank).toContain("tabular-nums"));
  });
});

// ── Dark-mode contract: key tokens carry dark: variants ───────────────────────
// Guards against accidentally stripping dark: suffixes during a styles.ts refactor.
// Only a representative sample is checked — full token coverage is in the light-
// mode contract tests above.

describe("styles.ts — dark: variant presence (ADR 0002)", () => {
  it("inputClass has dark bg and text variants", () => {
    expect(inputClass).toContain("dark:bg-stone-800");
    expect(inputClass).toContain("dark:text-stone-100");
  });

  it("btnPrimary inverts to a light fill in dark mode", () => {
    expect(btnPrimary).toContain("dark:bg-stone-200");
    expect(btnPrimary).toContain("dark:text-stone-900");
  });

  it("btnPrimaryCompact inverts in dark mode", () => {
    expect(btnPrimaryCompact).toContain("dark:bg-stone-200");
  });

  it("btnModalSubmit inverts in dark mode", () => {
    expect(btnModalSubmit).toContain("dark:bg-stone-200");
  });

  it("btnSecondary has dark border and text variants", () => {
    expect(btnSecondary).toContain("dark:border-stone-600");
    expect(btnSecondary).toContain("dark:text-stone-300");
  });

  it("btnCancel has dark variants", () => {
    expect(btnCancel).toContain("dark:border-stone-600");
  });

  it("btnGiveUp has dark border variant", () => {
    expect(btnGiveUp).toContain("dark:border-red-800");
  });

  it("colorWordChipBg has a dark variant", () => {
    expect(colorWordChipBg).toContain("dark:");
  });

  it("colorPangramBg has a dark variant", () => {
    expect(colorPangramBg).toContain("dark:");
  });

  it("feedbackValidClass has dark green text variant", () => {
    expect(feedbackValidClass).toContain("dark:text-green-400");
  });

  it("feedbackErrorClass has dark red text variant", () => {
    expect(feedbackErrorClass).toContain("dark:text-red-400");
  });

  it("lbRowBase has dark border variant", () => {
    expect(lbRowBase).toContain("dark:border-stone-800");
  });

  it("lbTdScore has dark text variant", () => {
    expect(lbTdScore).toContain("dark:text-stone-200");
  });
});
