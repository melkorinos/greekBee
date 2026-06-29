// styles.test.ts
// Smoke-tests for src/components/leksokipos/styles.ts — the Leksokipos-only
// class recipes split out of the platform recipes file (ADR 0009).
//
// Same contract as recipes.test.ts: non-empty strings, key tokens present, and
// NO `dark:` pairs (light/dark flips come from semantic tokens in globals.css).

import { describe, expect, it } from "vitest";
import {
  btnGiveUp,
  feedbackAlreadySuggestedClass,
  feedbackErrorClass,
  feedbackJustSuggestedClass,
  feedbackPangramClass,
  feedbackSuggestLinkClass,
  feedbackValidClass,
  feedbackValidContainer,
  foundWordClass,
  foundWordPangramClass,
  scoreBarFill,
  scoreBarTrack,
} from "@/components/leksokipos/styles";

const ALL_TOKENS: [string, string][] = [
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
  [btnGiveUp, "btnGiveUp"],
];

describe("leksokipos/styles.ts — every token is a non-empty string", () => {
  it.each(ALL_TOKENS)("'%s' is a non-empty string (%s)", (token, name) => {
    expect(typeof token, `${name} should be a string`).toBe("string");
    expect(token.trim().length, `${name} should not be empty`).toBeGreaterThan(0);
  });
});

describe("leksokipos/styles.ts — visual design contracts", () => {
  describe("feedback recipes reference the expected tokens", () => {
    it("valid word → correct", () => expect(feedbackValidClass).toContain("correct"));
    it("error → danger", () => expect(feedbackErrorClass).toContain("danger"));
    it("pangram → accent", () => expect(feedbackPangramClass).toContain("accent"));
    it("just-suggested → correct", () => expect(feedbackJustSuggestedClass).toContain("correct"));
    it("already-suggested → muted", () => expect(feedbackAlreadySuggestedClass).toContain("muted"));
  });

  describe("found-word chips reference the expected tokens", () => {
    it("normal chip uses the raised surface", () => expect(foundWordClass).toContain("bg-surface-raised"));
    it("pangram chip uses the brand fill", () => expect(foundWordPangramClass).toContain("bg-brand"));
    // Documented exception: dark text on a fixed-yellow chip stays dark in both themes.
    it("pangram chip keeps fixed dark text", () => expect(foundWordPangramClass).toContain("text-stone-900"));
    it("pangram chip is bold", () => expect(foundWordPangramClass).toContain("font-semibold"));
  });

  describe("score bar references the expected tokens", () => {
    it("track → border", () => expect(scoreBarTrack).toContain("bg-border"));
    it("fill → brand", () => expect(scoreBarFill).toContain("bg-brand"));
    it("fill has smooth transition", () => expect(scoreBarFill).toContain("transition-all"));
  });

  describe("give-up button", () => {
    it("uses the danger tone", () => expect(btnGiveUp).toContain("text-danger"));
    it("is a pill", () => expect(btnGiveUp).toContain("rounded-full"));
  });
});

describe("leksokipos/styles.ts — no dark: variants (ADR 0008)", () => {
  it.each(ALL_TOKENS)("'%s' has no dark: variant (%s)", (token) => {
    expect(token).not.toContain("dark:");
  });
});
