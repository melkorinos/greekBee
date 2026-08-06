// milestones.test.ts — pure route-input hygiene for POST /api/milestones (ADR 0013).
//
// player_milestones is append-forever with anon INSERT, so junk written there is
// permanent and no id whitelist is possible for arbitrary words. The sanitizer
// bounds junk by shape and dispatches on `kind`, absorbing what
// sanitizePangramWords and sanitizeFoundWords each did for their own table.
//
// The server runs ZERO detection (ADR 0013): this is hygiene, never verification
// against a puzzle.

import { describe, expect, it } from "vitest";

import { MAX_MILESTONES_PER_REQUEST, sanitizeMilestones } from "@/games/leksokipos/lib/milestones";

describe("sanitizeMilestones", () => {
  it("returns [] for non-array input", () => {
    expect(sanitizeMilestones(null)).toEqual([]);
    expect(sanitizeMilestones("word")).toEqual([]);
    expect(sanitizeMilestones({ kind: "word" })).toEqual([]);
  });

  it("drops entries with an unknown kind", () => {
    expect(sanitizeMilestones([{ kind: "streak", detail: "" }])).toEqual([]);
    expect(sanitizeMilestones([{ detail: "" }])).toEqual([]);
  });

  // ── kind: 'word' ────────────────────────────────────────────────────────────

  it("stamps a word's length as `value`, server-side", () => {
    // θαλασσινοσ is 10 letters — the value must come from the word, never the client.
    expect(sanitizeMilestones([{ kind: "word", detail: "θαλασσινοσ", value: 99 }]))
      .toEqual([{ kind: "word", detail: "θαλασσινοσ", value: 10 }]);
  });

  it("normalizes a word's accents and casing before storing it", () => {
    // The UNIQUE text key must never see two forms of one find, or the count inflates.
    expect(sanitizeMilestones([{ kind: "word", detail: "ΘΑΛΑΣΣΙΝΌΣ" }]))
      .toEqual([{ kind: "word", detail: "θαλασσινοσ", value: 10 }]);
  });

  it("enforces the ≥10-letter floor as the authoritative backstop", () => {
    // The client filters too, but the client filter is an optimisation — this is
    // the rule. σπιτι is 5 letters.
    expect(sanitizeMilestones([{ kind: "word", detail: "σπιτι" }])).toEqual([]);
  });

  it("drops a word that cannot be a Greek find by shape", () => {
    expect(sanitizeMilestones([{ kind: "word", detail: "abcdefghij" }])).toEqual([]);
    expect(sanitizeMilestones([{ kind: "word", detail: "θαλασσιν0σ" }])).toEqual([]);
    expect(sanitizeMilestones([{ kind: "word", detail: 42 }])).toEqual([]);
  });

  // ── kind: 'pangram' ─────────────────────────────────────────────────────────

  it("accepts a pangram with no value (absent is not zero)", () => {
    expect(sanitizeMilestones([{ kind: "pangram", detail: "διακοπτησ" }]))
      .toEqual([{ kind: "pangram", detail: "διακοπτησ", value: null }]);
  });

  it("keeps the pangram shape floor at 7, below the word floor", () => {
    // A pangram uses all seven puzzle letters, so 7-letter pangrams are real —
    // the ≥10 word floor must not leak onto this kind.
    expect(sanitizeMilestones([{ kind: "pangram", detail: "ανθρωπο" }]))
      .toEqual([{ kind: "pangram", detail: "ανθρωπο", value: null }]);
    expect(sanitizeMilestones([{ kind: "pangram", detail: "σπιτι" }])).toEqual([]);
  });

  // ── the detail-less day counters ────────────────────────────────────────────

  it("forces detail to '' on top_rank, whatever the client sent", () => {
    // A nullable or client-controlled detail would break insert-if-absent: the
    // same day could then land twice under two different details.
    expect(sanitizeMilestones([{ kind: "top_rank", detail: "απολυτοτητα" }]))
      .toEqual([{ kind: "top_rank", detail: "", value: null }]);
    expect(sanitizeMilestones([{ kind: "top_rank" }]))
      .toEqual([{ kind: "top_rank", detail: "", value: null }]);
  });

  it("carries tzimani's found-ratio percentage through as `value`", () => {
    expect(sanitizeMilestones([{ kind: "tzimani", value: 73 }]))
      .toEqual([{ kind: "tzimani", detail: "", value: 73 }]);
  });

  it("bounds a tzimani percentage to a whole 0–100 and nulls anything else", () => {
    const value = (input: unknown) => sanitizeMilestones([{ kind: "tzimani", value: input }])[0]?.value;
    expect(value(150)).toBe(100);
    expect(value(-5)).toBe(0);
    expect(value(72.6)).toBe(73);
    expect(value("73")).toBeNull();
    expect(value(undefined)).toBeNull();
    expect(value(NaN)).toBeNull();
  });

  it("never stores a value for top_rank", () => {
    expect(sanitizeMilestones([{ kind: "top_rank", value: 100 }]))
      .toEqual([{ kind: "top_rank", detail: "", value: null }]);
  });

  // ── batch hygiene ───────────────────────────────────────────────────────────

  it("de-dupes on (kind, detail) so one batch can't collide with itself", () => {
    expect(sanitizeMilestones([
      { kind: "word", detail: "θαλασσινοσ" },
      { kind: "word", detail: "ΘΑΛΑΣΣΙΝΟΣ" },
    ])).toEqual([{ kind: "word", detail: "θαλασσινοσ", value: 10 }]);
  });

  it("keeps one word under both kinds — a pangram is also a find", () => {
    expect(sanitizeMilestones([
      { kind: "word", detail: "παρακολουθηση" },
      { kind: "pangram", detail: "παρακολουθηση" },
    ])).toEqual([
      { kind: "word", detail: "παρακολουθηση", value: 13 },
      { kind: "pangram", detail: "παρακολουθηση", value: null },
    ]);
  });

  it("keeps the two detail-less counters apart in one batch", () => {
    expect(sanitizeMilestones([
      { kind: "top_rank" },
      { kind: "tzimani", value: 71 },
    ])).toEqual([
      { kind: "top_rank", detail: "", value: null },
      { kind: "tzimani", detail: "", value: 71 },
    ]);
  });

  it("caps the batch", () => {
    const many = Array.from({ length: MAX_MILESTONES_PER_REQUEST + 25 }, (_, i) => ({
      kind:   "pangram",
      detail: `διακοπτη${String.fromCharCode(945 + (i % 24))}${String.fromCharCode(945 + Math.floor(i / 24))}`,
    }));
    expect(sanitizeMilestones(many)).toHaveLength(MAX_MILESTONES_PER_REQUEST);
  });
});
