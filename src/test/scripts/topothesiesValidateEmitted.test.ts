// Seam (b) — the emitted-data validator for the Topothesies pipeline.
//
// After mapshaper dissolves + we curate answers, validateEmitted is the gate the
// two static files must pass before they can be committed. It guards the
// invariants handoff-01 lists: answer↔shape id parity, every confirmed-split
// island present, coordinates inside Greece's bbox, and NO accents in any
// *Normalized field (the platform no-accent invariant).

import { describe, it, expect } from "vitest";

import { validateEmitted, GREECE_BBOX } from "../../../scripts/lib/topothesies/validateEmitted";
import type { TopothesiesAnswer, TopothesiesShape } from "../../../src/games/topothesies/types";

const answer = (over: Partial<TopothesiesAnswer> = {}): TopothesiesAnswer => ({
  id: "aegina",
  name: "Αίγινα",
  nameNormalized: "αιγινα",
  capital: "Αίγινα",
  capitalNormalized: "αιγινα",
  capitalCoord: [23.43, 37.75],
  centroid: [23.47, 37.73],
  aliases: [],
  region: "attica",
  isIsland: true,
  ...over,
});

const shape = (id: string): TopothesiesShape => ({ id, path: "M0 0 L1 1 Z", viewBox: "0 0 10 10" });

describe("validateEmitted — a clean dataset", () => {
  it("returns no errors", () => {
    const errors = validateEmitted(
      { answers: [answer()], shapes: [shape("aegina")] },
      { requiredIds: ["aegina"] },
    );
    expect(errors).toEqual([]);
  });
});

describe("validateEmitted — id parity", () => {
  it("flags an answer with no matching shape", () => {
    const errors = validateEmitted(
      { answers: [answer()], shapes: [] },
      { requiredIds: [] },
    );
    expect(errors.join("\n")).toMatch(/aegina/);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("flags an orphan shape with no matching answer", () => {
    const errors = validateEmitted(
      { answers: [answer()], shapes: [shape("aegina"), shape("ghost")] },
      { requiredIds: ["aegina"] },
    );
    expect(errors.join("\n")).toMatch(/ghost/);
  });
});

describe("validateEmitted — confirmed splits must be present", () => {
  it("flags a missing confirmed-split island", () => {
    const errors = validateEmitted(
      { answers: [answer()], shapes: [shape("aegina")] },
      { requiredIds: ["aegina", "skyros"] },
    );
    expect(errors.join("\n")).toMatch(/skyros/);
  });
});

describe("validateEmitted — coordinates inside Greece", () => {
  it("flags a centroid outside the bbox", () => {
    const errors = validateEmitted(
      { answers: [answer({ centroid: [2.35, 48.85] })], shapes: [shape("aegina")] },
      { requiredIds: ["aegina"] },
    );
    expect(errors.join("\n")).toMatch(/centroid/i);
  });

  it("flags a capitalCoord outside the bbox", () => {
    const errors = validateEmitted(
      { answers: [answer({ capitalCoord: [2.35, 48.85] })], shapes: [shape("aegina")] },
      { requiredIds: ["aegina"] },
    );
    expect(errors.join("\n")).toMatch(/capital/i);
  });

  it("uses GREECE_BBOX by default and accepts a real Greek coordinate", () => {
    // Kastelorizo — Greece's eastern extreme (~29.6E). Must be inside the box.
    const errors = validateEmitted(
      { answers: [answer({ centroid: [29.6, 36.15], capitalCoord: [29.6, 36.15] })], shapes: [shape("aegina")] },
      { requiredIds: ["aegina"] },
    );
    expect(errors).toEqual([]);
    expect(GREECE_BBOX.maxLng).toBeGreaterThanOrEqual(29.6);
  });
});

describe("validateEmitted — no accents in normalized fields", () => {
  it("flags an accent in nameNormalized", () => {
    const errors = validateEmitted(
      { answers: [answer({ nameNormalized: "αίγινα" })], shapes: [shape("aegina")] },
      { requiredIds: ["aegina"] },
    );
    expect(errors.join("\n")).toMatch(/nameNormalized/);
  });

  it("flags an accent in capitalNormalized", () => {
    const errors = validateEmitted(
      { answers: [answer({ capitalNormalized: "χαλκίδα" })], shapes: [shape("aegina")] },
      { requiredIds: ["aegina"] },
    );
    expect(errors.join("\n")).toMatch(/capitalNormalized/);
  });

  it("flags an accent in an alias", () => {
    const errors = validateEmitted(
      { answers: [answer({ aliases: ["σπέτσες"] })], shapes: [shape("aegina")] },
      { requiredIds: ["aegina"] },
    );
    expect(errors.join("\n")).toMatch(/alias/i);
  });
});

describe("validateEmitted — duplicate ids", () => {
  it("flags a duplicate answer id", () => {
    const errors = validateEmitted(
      { answers: [answer(), answer()], shapes: [shape("aegina")] },
      { requiredIds: ["aegina"] },
    );
    expect(errors.join("\n")).toMatch(/duplicate/i);
  });
});
