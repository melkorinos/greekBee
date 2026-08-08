// evaluateGuess.test.ts — guess resolution + Worldle hint assembly (pure).
// Matching is accent-insensitive via the shared normalizeLetters. Hints are
// computed against real centroid / capitalCoord metadata, never geometry.

import { describe, expect, it } from "vitest";

import type { TopothesiesAnswer } from "@/games/topothesies/types";
import {
  evaluateCapitalGuess,
  evaluateShapeGuess,
  resolveAnswerId,
} from "@/games/topothesies/lib/evaluateGuess";

const MAX_KM = 500;

function mk(partial: Partial<TopothesiesAnswer> & { id: string }): TopothesiesAnswer {
  return {
    name: partial.id,
    nameNormalized: partial.id,
    capital: partial.id,
    capitalNormalized: partial.id,
    capitalCoord: [24, 39],
    centroid: [24, 39],
    aliases: [],
    region: "region",
    isIsland: false,
    ...partial,
  };
}

// One degree of latitude apart ≈ 111 km; guess sits north of target → arrow ↓.
const TARGET = mk({
  id: "naxos",
  name: "Νάξος",
  nameNormalized: "ναξοσ",
  capital: "Χώρα",
  capitalNormalized: "χωρα",
  capitalCoord: [25.5, 37.1],
  centroid: [25, 40],
  aliases: ["χωρα ναξου"],
});
const GUESS = mk({
  id: "milos",
  name: "Μήλος",
  nameNormalized: "μηλοσ",
  capital: "Πλάκα",
  capitalNormalized: "πλακα",
  capitalCoord: [24.42, 36.74],
  centroid: [25, 41],
});
const ANSWERS = [TARGET, GUESS];

describe("resolveAnswerId", () => {
  it("resolves an exact normalized name to its id", () => {
    expect(resolveAnswerId("ναξοσ", ANSWERS)).toBe("naxos");
  });

  it("is accent-insensitive — the accented display form resolves", () => {
    expect(resolveAnswerId("Νάξος", ANSWERS)).toBe("naxos");
  });

  it("resolves via an alias", () => {
    expect(resolveAnswerId("Χώρα Νάξου", ANSWERS)).toBe("naxos");
  });

  it("returns null for an unknown name", () => {
    expect(resolveAnswerId("Ατλαντίδα", ANSWERS)).toBeNull();
  });
});

describe("evaluateShapeGuess", () => {
  it("marks the target id correct and attaches no hint", () => {
    const r = evaluateShapeGuess("naxos", TARGET, ANSWERS, MAX_KM);
    expect(r.correct).toBe(true);
    expect(r.hint).toBeNull();
  });

  it("marks a wrong id incorrect with a distance/arrow/proximity hint", () => {
    const r = evaluateShapeGuess("milos", TARGET, ANSWERS, MAX_KM);
    expect(r.correct).toBe(false);
    expect(r.hint).not.toBeNull();
    // Guess is ~1° latitude north of the target.
    expect(r.hint!.distanceKm).toBeGreaterThan(110);
    expect(r.hint!.distanceKm).toBeLessThan(112);
    expect(r.hint!.arrow).toBe("↓"); // target lies south of the guess
    expect(r.hint!.proximityPct).toBeGreaterThan(0);
    expect(r.hint!.proximityPct).toBeLessThan(100);
  });

  it("treats an unresolvable guess id as incorrect with no hint", () => {
    const r = evaluateShapeGuess("atlantis", TARGET, ANSWERS, MAX_KM);
    expect(r.correct).toBe(false);
    expect(r.hint).toBeNull();
  });
});

describe("evaluateCapitalGuess", () => {
  it("marks the matching capital correct (accent-insensitive), no distance hint in this stage", () => {
    const r = evaluateCapitalGuess("Χώρα", TARGET, ANSWERS);
    expect(r.correct).toBe(true);
    expect(r.known).toBe(true);
    expect(r).not.toHaveProperty("hint");
  });

  it("marks a wrong-but-known capital incorrect but known (no distance hint)", () => {
    const r = evaluateCapitalGuess("Πλάκα", TARGET, ANSWERS);
    expect(r.correct).toBe(false);
    expect(r.known).toBe(true);
  });

  it("marks an unknown capital incorrect and not known (a typo that no-ops)", () => {
    const r = evaluateCapitalGuess("Ουτοπία", TARGET, ANSWERS);
    expect(r.correct).toBe(false);
    expect(r.known).toBe(false);
  });
});
