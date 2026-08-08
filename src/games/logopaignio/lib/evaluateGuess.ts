// evaluateGuess.ts — match one typed brand guess against the puzzle (pure, no
// React). Matching is deliberately forgiving: accent/case-insensitive and
// whitespace-agnostic (platform normalizeLetters + drop all whitespace) so a
// player who clearly knew the brand isn't failed on cosmetics. That alone can't
// bridge two alphabets, so each puzzle carries a curated `accept` list holding
// every legit spelling — the Greek form, the Latin form, common variants — and a
// guess wins if its normalised form equals any accepted spelling's normalised
// form.

import { normalizeLetters } from "@/lib/normalize";

import type { LogopaignioPuzzle } from "../types";

/** Fold a brand string for comparison: accent/case via normalizeLetters, then
 *  drop ALL whitespace so "My Market" / "mymarket" / " my  market " all agree. */
export function normalizeAnswer(text: string): string {
  return normalizeLetters(text).replace(/\s+/g, "");
}

/**
 * Evaluate `input` against `puzzle`. Returns whether it matches any accepted
 * spelling and the normalised input (the caller uses its emptiness to treat
 * blank/whitespace-only guesses as input noise rather than a real guess).
 */
export function evaluateGuess(
  input: string,
  puzzle: LogopaignioPuzzle,
): { correct: boolean; normalizedInput: string } {
  const normalizedInput = normalizeAnswer(input);
  const correct =
    normalizedInput.length > 0 &&
    puzzle.accept.some((spelling) => normalizeAnswer(spelling) === normalizedInput);
  return { correct, normalizedInput };
}
