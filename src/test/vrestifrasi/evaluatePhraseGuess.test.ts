import { describe, it, expect } from "vitest";
import { evaluatePhraseGuess } from "@/games/vrestifrasi/lib/evaluatePhraseGuess";

describe("evaluatePhraseGuess", () => {
  // ── Exact match ──────────────────────────────────────────────────────────────
  it("marks all correct when guess matches answer exactly", () => {
    const result = evaluatePhraseGuess(["καλη", "μερα"], ["καλη", "μερα"]);
    expect(result[0]).toEqual(["correct", "correct", "correct", "correct"]);
    expect(result[1]).toEqual(["correct", "correct", "correct", "correct"]);
  });

  // ── All absent ───────────────────────────────────────────────────────────────
  it("marks all absent when no letters match", () => {
    const result = evaluatePhraseGuess(["ββββ", "γγγγ"], ["αααα", "δδδδ"]);
    expect(result[0]).toEqual(["absent", "absent", "absent", "absent"]);
    expect(result[1]).toEqual(["absent", "absent", "absent", "absent"]);
  });

  // ── Present (yellow) — same word, wrong position ─────────────────────────────
  it("marks present when letter is in same word but wrong position", () => {
    // answer[0] = "αβγδ"; guess[0] = "βαγδ" → positions 0,1 are swapped → present, present
    const result = evaluatePhraseGuess(["βαγδ", "εεεε"], ["αβγδ", "εεεε"]);
    expect(result[0][0]).toBe("present");  // β is in word 0 but at pos 1
    expect(result[0][1]).toBe("present");  // α is in word 0 but at pos 0
    expect(result[0][2]).toBe("correct");  // γ correct
    expect(result[0][3]).toBe("correct");  // δ correct
  });

  // ── Misplaced-word (purple) — letter belongs to a different word ──────────────
  it("marks misplaced-word when letter exists in a different word", () => {
    // answer: ["αβγ", "δεζ"]; guess: ["δβγ", "αεζ"]
    // word 0, pos 0: 'δ' — not in word 0 pool, but in word 1 pool → misplaced-word
    // word 1, pos 0: 'α' — not in word 1 pool, but in word 0 pool → misplaced-word
    const result = evaluatePhraseGuess(["δβγ", "αεζ"], ["αβγ", "δεζ"]);
    expect(result[0][0]).toBe("misplaced-word");
    expect(result[0][1]).toBe("correct");
    expect(result[0][2]).toBe("correct");
    expect(result[1][0]).toBe("misplaced-word");
    expect(result[1][1]).toBe("correct");
    expect(result[1][2]).toBe("correct");
  });

  // ── Duplicate letter handling — same word ─────────────────────────────────────
  it("handles duplicate letters correctly within the same word", () => {
    // answer: ["αβα", "γγγ"]; guess: ["ααα", "γγγ"]
    // word 0: pos0 'α'=correct, pos1 'α'→remaining={β:1} no 'α' left→absent, pos2 'α'=correct
    const result = evaluatePhraseGuess(["ααα", "γγγ"], ["αβα", "γγγ"]);
    expect(result[0][0]).toBe("correct");
    expect(result[0][1]).toBe("absent");  // no 'α' left after consuming pos0 and pos2
    expect(result[0][2]).toBe("correct");
    expect(result[1]).toEqual(["correct", "correct", "correct"]);
  });

  // ── Cross-word duplicate consumption ─────────────────────────────────────────
  it("consumes cross-word letter only once (purple)", () => {
    // answer: ["αβ", "γδ"]; guess: ["γγ", "εδ"]
    // Pass 1: word0 pos0 γ≠α → remaining[0]={α:1}; pos1 γ≠β → remaining[0]={α:1,β:1}
    //         word1 pos0 ε≠γ → remaining[1]={γ:1}; pos1 δ=δ → correct
    // Pass 2:
    //   word0 pos0: γ not in remaining[0], IS in remaining[1]={γ:1} → misplaced-word; remaining[1]={γ:0}
    //   word0 pos1: γ not in remaining[0], remaining[1][γ]=0 → absent (already consumed)
    const result = evaluatePhraseGuess(["γγ", "εδ"], ["αβ", "γδ"]);
    expect(result[0][0]).toBe("misplaced-word"); // first γ — consumed from word1 pool
    expect(result[0][1]).toBe("absent");         // second γ — pool already empty
    expect(result[1][0]).toBe("absent");         // ε not anywhere
    expect(result[1][1]).toBe("correct");
  });

  // ── Purple capped by cross-word letter count ──────────────────────────────────
  it("limits purple marks to the number of times the letter appears cross-word", () => {
    // answer: ["ξξξ", "ααβ"]  — word1 has 2 α's available after pass1 (no exact matches)
    // guess:  ["ααα", "βξξ"]  — word0 has 3 α's; only 2 from word1 pool → first 2 purple, third absent
    // Pass 1: no exact matches (all mismatch). remaining[0]={ξ:3}, remaining[1]={α:2,β:1}
    // Pass 2 for word0: α→purple(remaining[1][α]=1), α→purple(remaining[1][α]=0), α→absent
    // Pass 2 for word1: β→present(same-word), ξ→purple(remaining[0][ξ]=2), ξ→purple(remaining[0][ξ]=1)
    const result = evaluatePhraseGuess(["ααα", "βξξ"], ["ξξξ", "ααβ"]);
    expect(result[0][0]).toBe("misplaced-word"); // first α  — consumed from word1 pool
    expect(result[0][1]).toBe("misplaced-word"); // second α — consumed from word1 pool
    expect(result[0][2]).toBe("absent");         // third α  — word1 pool exhausted
    expect(result[1][0]).toBe("present");        // β is in word1 (same-word yellow)
    expect(result[1][1]).toBe("misplaced-word"); // ξ in word0 pool
    expect(result[1][2]).toBe("misplaced-word"); // ξ in word0 pool
  });

  // ── Three words ───────────────────────────────────────────────────────────────
  it("works with three-word phrases", () => {
    const result = evaluatePhraseGuess(["αα", "ββ", "γγ"], ["αα", "ββ", "γγ"]);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(["correct", "correct"]);
    expect(result[1]).toEqual(["correct", "correct"]);
    expect(result[2]).toEqual(["correct", "correct"]);
  });

  // ── Mixed states in one row ───────────────────────────────────────────────────
  it("produces correct / present / misplaced-word / absent in same row", () => {
    // answer: ["αβγ", "δεζ"]
    // guess:  ["αεδ", "ηηη"]
    // word0, pos0: α = correct
    // word0, pos1: ε — not in word0 pool ({β:1,γ:1}), in word1 pool ({ε:1}) → misplaced-word
    // word0, pos2: δ — not in word0 pool ({β:1,γ:1}), in word1 pool ({δ:1}) → misplaced-word
    // word1, all: η → absent
    const result = evaluatePhraseGuess(["αεδ", "ηηη"], ["αβγ", "δεζ"]);
    expect(result[0][0]).toBe("correct");
    expect(result[0][1]).toBe("misplaced-word");
    expect(result[0][2]).toBe("misplaced-word");
    expect(result[1]).toEqual(["absent", "absent", "absent"]);
  });

  // ── Yellow takes priority over purple ────────────────────────────────────────
  it("marks present (yellow) not purple when letter is in same word pool", () => {
    // answer: ["αβ", "αγ"]; guess: ["βα", "γα"]
    // word0, pos0: β — in word0 pool ({α:1,β:0... wait
    // answer[0]="αβ": after pass1 (no exact matches since guess[0]="βα"):
    //   remaining[0] = {α:1, β:1}? No — pass1: pos0 'β'≠'α'→remaining[0][α]++; pos1 'α'≠'β'→remaining[0][β]++
    //   So remaining[0] = {α:1, β:1}
    // pass2, word0, pos0: 'β' — remaining[0][β]=1>0 → PRESENT (same word)
    // pass2, word0, pos1: 'α' — remaining[0][α]=1>0 → PRESENT (same word)
    const result = evaluatePhraseGuess(["βα", "γα"], ["αβ", "αγ"]);
    expect(result[0][0]).toBe("present");
    expect(result[0][1]).toBe("present");
  });
});
