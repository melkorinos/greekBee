// performance.test.ts
//
// These tests guard against regressions that would increase Vercel Fluid Active
// CPU time — the billing metric that is the most likely usage cap to be hit.
//
// ── Why this file exists ───────────────────────────────────────────────────────
// "Fluid Active CPU" is billed per ms of Node.js serverless execution time.
// The two most expensive operations in this app are:
//
//   1. computeValidWords — linear scan of the 811 k-word Greek dictionary.
//      Called by buildCustomPuzzle for every unique custom URL combo.
//      A ~200 ms scan × thousands of requests = the #1 cost driver.
//      Mitigated by: module-level validWordsCache in buildCustomPuzzle.
//
//   2. getPrebuiltPuzzleByLetters — linear scan of the 1 008-puzzle pre-built list.
//      Called on every [center]/[outer] page hit to detect daily puzzles.
//      Acceptable at <1 ms, but tested here to catch accidental O(n²) regressions.
//
// ── Approach ──────────────────────────────────────────────────────────────────
// We use Vitest's built-in `performance.now()` timing rather than a dedicated
// perf framework to keep dependencies zero. Thresholds are generous (10× the
// measured baseline) to avoid flaky CI failures while still catching
// catastrophic regressions (e.g. accidentally iterating the word list twice).
//
// All tests run against the real words-el.json so they reflect actual production
// input size. Import cost is paid once per test-runner process (module cache).

import { buildCustomPuzzle, getPrebuiltPuzzleByLetters } from "@/data/spelling-bee/index";
import { describe, expect, it } from "vitest";

import { computeValidWords } from "@/games/spelling-bee/lib/computeValidWords";
import wordListEl from "@/data/words-el.json";

// ── Thresholds ────────────────────────────────────────────────────────────────
// Measured on a mid-range dev machine; Vercel Fluid instances are comparable.
// Each threshold is ~10× the measured baseline so CI on slower machines stays green.

/** Maximum acceptable ms to scan the full 811 k word list once.
 *  800 ms gives headroom for slow CI / Vitest startup overhead while still
 *  catching a genuine O(n²) regression (which would take seconds). */
const COMPUTE_VALID_WORDS_BUDGET_MS = 800;

/** Maximum acceptable ms for the second call (must hit the module-level cache) */
const CACHE_HIT_BUDGET_MS = 5;

/** Maximum acceptable ms to scan the 1 008-puzzle curated list */
const CURATED_LOOKUP_BUDGET_MS = 10;

// ── computeValidWords — raw scan speed ───────────────────────────────────────

describe("performance: computeValidWords (full word list)", () => {
  // Use a letter combo with a moderate number of results so the filter loop
  // actually exercises both the include and exclude branches.
  const CENTER = "α";
  const OUTER  = ["λ", "τ", "ι", "δ", "ε", "σ"];
  const wordList = wordListEl as string[];

  it(`scans ${wordList.length.toLocaleString()} words within ${COMPUTE_VALID_WORDS_BUDGET_MS} ms`, () => {
    const t0 = performance.now();
    const result = computeValidWords(CENTER, OUTER, wordList);
    const elapsed = performance.now() - t0;

    // Sanity check: we got real results (catches misconfigured imports)
    expect(result.length).toBeGreaterThan(0);

    expect(elapsed).toBeLessThan(COMPUTE_VALID_WORDS_BUDGET_MS);
  });
});

// ── buildCustomPuzzle — cache behaviour ──────────────────────────────────────

describe("performance: buildCustomPuzzle module-level cache", () => {
  // Pick a combo that is NOT a curated daily puzzle so buildCustomPuzzle
  // actually exercises the computeValidWords path, not a stored validWords array.
  const CENTER = "ζ";
  const OUTER  = ["α", "β", "γ", "δ", "ε", "η"]; // rare combo — not in curated list

  it("first call (cold) completes within budget", () => {
    const t0 = performance.now();
    buildCustomPuzzle(CENTER, OUTER);
    const elapsed = performance.now() - t0;

    expect(elapsed).toBeLessThan(COMPUTE_VALID_WORDS_BUDGET_MS);
  });

  it(`second call (warm cache) completes within ${CACHE_HIT_BUDGET_MS} ms`, () => {
    // The module-level validWordsCache should return the Map entry immediately.
    // If this fails it means the cache was bypassed or the Map was cleared between calls.
    buildCustomPuzzle(CENTER, OUTER); // ensure cache is warm

    const t0 = performance.now();
    buildCustomPuzzle(CENTER, OUTER);
    const elapsed = performance.now() - t0;

    expect(elapsed).toBeLessThan(CACHE_HIT_BUDGET_MS);
  });

  it("cache is keyed by letter set, not argument order — same letters return same result", () => {
    // Outer letter order in the URL may differ from the canonical sorted form;
    // the cache key uses sorted outer letters so both orderings are a cache hit.
    const a = buildCustomPuzzle(CENTER, OUTER);
    const b = buildCustomPuzzle(CENTER, [...OUTER].reverse());

    expect(a.id).toBe(b.id);
    expect(a.validWords).toEqual(b.validWords);
  });
});

// ── getPrebuiltPuzzleByLetters — linear scan of pre-built list ──────────────────

describe("performance: getPrebuiltPuzzleByLetters (pre-built puzzle scan)", () => {
  it(`finds a matching puzzle within ${CURATED_LOOKUP_BUDGET_MS} ms`, () => {
    // Use a known pre-built combo (first puzzle in the file: 2026-03-25-el)
    const t0 = performance.now();
    const result = getPrebuiltPuzzleByLetters("ι", ["ω", "ν", "π", "ε", "α", "φ"]);
    const elapsed = performance.now() - t0;

    expect(result).not.toBeNull();
    expect(result?.id).toMatch(/^\d{4}-\d{2}-\d{2}-el$/);
    expect(elapsed).toBeLessThan(CURATED_LOOKUP_BUDGET_MS);
  });

  it(`returns null for a non-pre-built combo within ${CURATED_LOOKUP_BUDGET_MS} ms`, () => {
    // Worst case: scans the entire list before returning null.
    const t0 = performance.now();
    const result = getPrebuiltPuzzleByLetters("ζ", ["α", "β", "γ", "δ", "ε", "η"]);
    const elapsed = performance.now() - t0;

    expect(result).toBeNull();
    expect(elapsed).toBeLessThan(CURATED_LOOKUP_BUDGET_MS);
  });
});

// ── computeValidWords — algorithmic complexity guard ─────────────────────────

describe("performance: computeValidWords does not scale super-linearly", () => {
  // Run against two list sizes and assert that time scales roughly linearly
  // (not quadratically). Uses a synthetic list to control size precisely.
  //
  // This catches regressions like accidentally adding a nested .includes() call
  // inside the already-iterating .filter() that turns O(n) into O(n²).

  function buildList(size: number): string[] {
    // Alternate between valid (contains "α") and invalid words to give the
    // filter real work to do in both branches.
    return Array.from({ length: size }, (_, i) =>
      i % 2 === 0 ? "αλατι" : "τελοσ"
    );
  }

  const CENTER = "α";
  const OUTER  = ["λ", "τ", "ι", "δ", "ε", "σ"];
  const SMALL  = 50_000;
  const LARGE  = 200_000; // 4× larger

  it("4× list size takes less than 10× the time (rules out O(n²))", () => {
    const smallList = buildList(SMALL);
    const largeList = buildList(LARGE);

    const t0 = performance.now();
    computeValidWords(CENTER, OUTER, smallList);
    const smallTime = performance.now() - t0;

    const t1 = performance.now();
    computeValidWords(CENTER, OUTER, largeList);
    const largeTime = performance.now() - t1;

    // Linear expectation: largeTime ≈ 4× smallTime.
    // Generous 10× upper bound to tolerate JIT variance.
    // If this fails, someone added an O(n²) operation inside the filter.
    expect(largeTime).toBeLessThan(smallTime * 10);
  });
});
