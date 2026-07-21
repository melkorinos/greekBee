// evaluateGuess.ts — resolve a typed guess and assemble its Worldle hint (pure).
// Accent-insensitive matching goes through the shared normalizeLetters (the
// platform no-accent invariant). Hints read ONLY answer metadata (centroid for
// the shape stage, capitalCoord for the capital stage) — never shapes.json.

import { normalizeLetters } from "@/lib/normalize";

import type { GeoHint, TopothesiesAnswer } from "../types";

import { bearingToArrow, haversineKm, proximityPct } from "./geo";

/**
 * Resolve typed text to an answer id via its normalized name or aliases, or
 * null if nothing matches. Aliases are stored accent-free but are normalized
 * again here so a stray accented alias can never slip past the match.
 */
export function resolveAnswerId(
  text: string,
  answers: readonly TopothesiesAnswer[],
): string | null {
  const needle = normalizeLetters(text);
  const hit = answers.find(
    (a) =>
      a.nameNormalized === needle ||
      normalizeLetters(a.name) === needle ||
      a.aliases.some((alias) => normalizeLetters(alias) === needle),
  );
  return hit ? hit.id : null;
}

/** A hint between two coordinates, scaled to the dataset's max distance. */
function hintBetween(from: [number, number], to: [number, number], maxKm: number): GeoHint {
  const distanceKm = haversineKm(from, to);
  return {
    distanceKm,
    arrow: bearingToArrow(from, to),
    proximityPct: proximityPct(distanceKm, maxKm),
  };
}

/**
 * Stage 1: evaluate a resolved guess id against the target. Correct guesses
 * carry no hint; wrong guesses get distance/arrow/proximity from the guessed
 * unit's centroid toward the target's. An id absent from `answers` (should not
 * happen for autocomplete-constrained input) is incorrect with no hint.
 */
export function evaluateShapeGuess(
  guessId: string,
  target: TopothesiesAnswer,
  answers: readonly TopothesiesAnswer[],
  maxKm: number,
): { correct: boolean; hint: GeoHint | null } {
  if (guessId === target.id) return { correct: true, hint: null };
  const guess = answers.find((a) => a.id === guessId);
  if (!guess) return { correct: false, hint: null };
  return { correct: false, hint: hintBetween(guess.centroid, target.centroid, maxKm) };
}

/**
 * Stage 2 (bonus): evaluate a typed capital against the target's capital.
 * Candidate capitals are the answer set's capitals, so a wrong-but-known
 * capital is located by its owning entry's capitalCoord for the hint; an
 * unknown capital is incorrect with no locatable hint.
 */
export function evaluateCapitalGuess(
  guessText: string,
  target: TopothesiesAnswer,
  answers: readonly TopothesiesAnswer[],
  maxKm: number,
): { correct: boolean; hint: GeoHint | null } {
  const needle = normalizeLetters(guessText);
  if (needle === target.capitalNormalized) return { correct: true, hint: null };
  const known = answers.find((a) => a.capitalNormalized === needle);
  if (!known) return { correct: false, hint: null };
  return { correct: false, hint: hintBetween(known.capitalCoord, target.capitalCoord, maxKm) };
}
