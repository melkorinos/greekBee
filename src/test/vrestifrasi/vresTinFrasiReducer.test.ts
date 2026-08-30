import { describe, it, expect } from "vitest";
import {
  vresTinFrasiReducer,
  makeInitialVresTinFrasiState,
} from "@/games/vrestifrasi/hooks/vresTinFrasiReducer";
import type { VresTinFrasiPuzzle } from "@/games/vrestifrasi/types";

const PUZZLE: VresTinFrasiPuzzle = {
  id:             "2026-05-28-vresi",
  date:           "2026-05-28",
  phrase:         "Καλή μέρα φίλε",
  normalizedWords: ["καλη", "μερα", "φιλε"],
  wordLengths:    [4, 4, 4],
};

const VALID_WORDS = new Set(["καλη", "μερα", "φιλε", "αρετη", "αβγδ", "εζηθ", "ικλμ"]);

function initState() {
  return makeInitialVresTinFrasiState(PUZZLE);
}

describe("vresTinFrasiReducer — ADD_LETTER", () => {
  it("adds a letter to currentWords[currentWordIndex]", () => {
    const s = vresTinFrasiReducer(initState(), { type: "ADD_LETTER", letter: "κ" });
    expect(s.currentWords[0]).toBe("κ");
    expect(s.currentWordIndex).toBe(0);
  });

  it("auto-advances cursor when word reaches its length", () => {
    let s = initState();
    for (const l of ["κ", "α", "λ", "η"]) {
      s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
    }
    expect(s.currentWords[0]).toBe("καλη");
    expect(s.currentWordIndex).toBe(1); // advanced to word 1
  });

  it("does not add beyond all words being full", () => {
    let s = initState();
    // Fill all three words
    for (const l of ["κ", "α", "λ", "η"]) s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
    for (const l of ["μ", "ε", "ρ", "α"]) s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
    for (const l of ["φ", "ι", "λ", "ε"]) s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
    const before = JSON.stringify(s);
    const after = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: "ξ" });
    expect(JSON.stringify(after)).toBe(before); // no change
  });

  it("ignores input when game is not playing", () => {
    const won = { ...initState(), status: "won" as const };
    const s   = vresTinFrasiReducer(won, { type: "ADD_LETTER", letter: "α" });
    expect(s.currentWords[0]).toBe("");
  });
});

describe("vresTinFrasiReducer — DELETE_LETTER", () => {
  it("removes the last letter of the current word", () => {
    let s = vresTinFrasiReducer(initState(), { type: "ADD_LETTER", letter: "κ" });
    s     = vresTinFrasiReducer(s,           { type: "DELETE_LETTER" });
    expect(s.currentWords[0]).toBe("");
  });

  it("is a no-op when current word is empty", () => {
    const s1 = initState();
    const s2 = vresTinFrasiReducer(s1, { type: "DELETE_LETTER" });
    expect(s2.currentWords[0]).toBe("");
  });

  it("goes back to previous word when current is empty", () => {
    // Fill word 0, advance to word 1, then delete from empty word 1 → goes back
    let s = initState();
    for (const l of ["κ", "α", "λ", "η"]) s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
    expect(s.currentWordIndex).toBe(1);
    s = vresTinFrasiReducer(s, { type: "DELETE_LETTER" });
    expect(s.currentWordIndex).toBe(0); // moved back to word 0
    expect(s.currentWords[0]).toBe("καλ"); // last letter removed from word 0
  });
});

describe("vresTinFrasiReducer — CLEAR_WORD", () => {
  it("clears the current word", () => {
    let s = vresTinFrasiReducer(initState(), { type: "ADD_LETTER", letter: "κ" });
    s     = vresTinFrasiReducer(s,           { type: "CLEAR_WORD" });
    expect(s.currentWords[0]).toBe("");
  });
});

describe("vresTinFrasiReducer — FOCUS_WORD", () => {
  // The player types the whole phrase as one run of letters, so a typo three
  // words back used to cost every letter typed since — backspace is the only way
  // to reach it. FOCUS_WORD is what lets a tap put the cursor on the bad word and
  // edit it in place, and it is the ONLY action that moves the cursor backwards
  // without destroying anything on the way.
  function typed(words: string[], cursor: number) {
    return { ...initState(), currentWords: words, currentWordIndex: cursor };
  }

  it("moves the cursor to the clicked word and leaves every word intact", () => {
    const s = vresTinFrasiReducer(typed(["καλη", "μερα", "φι"], 2), {
      type: "FOCUS_WORD",
      wordIndex: 0,
    });
    expect(s.currentWordIndex).toBe(0);
    expect(s.currentWords).toEqual(["καλη", "μερα", "φι"]);
  });

  it("deleting after a focus jump eats the focused word, not the last one typed", () => {
    let s = vresTinFrasiReducer(typed(["καλη", "μερα", "φι"], 2), {
      type: "FOCUS_WORD",
      wordIndex: 0,
    });
    s = vresTinFrasiReducer(s, { type: "DELETE_LETTER" });
    expect(s.currentWords).toEqual(["καλ", "μερα", "φι"]);
  });

  it("typing after a focus jump refills the focused word", () => {
    let s = vresTinFrasiReducer(typed(["καλ", "μερα", ""], 0), {
      type: "FOCUS_WORD",
      wordIndex: 0,
    });
    s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: "η" });
    expect(s.currentWords[0]).toBe("καλη");
    // The word is full, so the cursor auto-advances exactly as it does when the
    // word is reached in order — a focus jump does not create a second mode.
    expect(s.currentWordIndex).toBe(1);
  });

  it("ignores an index outside the phrase", () => {
    const before = typed(["καλη", "", ""], 1);
    expect(vresTinFrasiReducer(before, { type: "FOCUS_WORD", wordIndex: 3 })).toBe(before);
    expect(vresTinFrasiReducer(before, { type: "FOCUS_WORD", wordIndex: -1 })).toBe(before);
  });

  it("is identity when the word is already focused, so a stray tap re-renders nothing", () => {
    const before = typed(["καλη", "", ""], 1);
    expect(vresTinFrasiReducer(before, { type: "FOCUS_WORD", wordIndex: 1 })).toBe(before);
  });

  it("ignores a focus jump once the round is over", () => {
    const over = { ...initState(), status: "won" as const, currentWordIndex: 2 };
    expect(vresTinFrasiReducer(over, { type: "FOCUS_WORD", wordIndex: 0 })).toBe(over);
  });
});

describe("vresTinFrasiReducer — SUBMIT_GUESS", () => {
  it("rejects when not all words are filled", () => {
    const s = vresTinFrasiReducer(initState(), { type: "SUBMIT_GUESS", validWords: VALID_WORDS });
    expect(s.status).toBe("playing");
    expect(s.lastMessage).toBeTruthy();
  });

  it("rejects when a word is not in pool or allowlist", () => {
    let s = initState();
    // Fill word0 with an invalid word 'ξξξξ'
    for (const l of ["ξ", "ξ", "ξ", "ξ"]) s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
    for (const l of ["μ", "ε", "ρ", "α"]) s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
    for (const l of ["φ", "ι", "λ", "ε"]) s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
    s = vresTinFrasiReducer(s, { type: "SUBMIT_GUESS", validWords: VALID_WORDS });
    expect(s.status).toBe("playing");
    expect(s.lastMessage).toMatch(/λίστα/i);
  });

  it("accepts valid guess and adds to guesses array", () => {
    let s = initState();
    for (const l of ["κ", "α", "λ", "η"]) s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
    for (const l of ["μ", "ε", "ρ", "α"]) s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
    for (const l of ["φ", "ι", "λ", "ε"]) s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
    s = vresTinFrasiReducer(s, { type: "SUBMIT_GUESS", validWords: VALID_WORDS });
    expect(s.guesses).toHaveLength(1);
    expect(s.status).toBe("won");
  });

  it("sets status to won when guess matches answer", () => {
    let s = initState();
    for (const l of ["κ", "α", "λ", "η"]) s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
    for (const l of ["μ", "ε", "ρ", "α"]) s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
    for (const l of ["φ", "ι", "λ", "ε"]) s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
    s = vresTinFrasiReducer(s, { type: "SUBMIT_GUESS", validWords: VALID_WORDS });
    expect(s.status).toBe("won");
  });

  it("sets status to lost after 6 failed guesses", () => {
    let s = initState();
    const cycles = ["αβγδ", "εζηθ", "αβγδ", "εζηθ", "αβγδ", "εζηθ"];
    for (const word of cycles) {
      s = { ...s, currentWords: [word, word, word], currentWordIndex: 0 } as typeof s;
      // Add letters manually would be complex; just directly set words via RESTORE hack
      // Actually use ADD_LETTER properly:
      s = { ...s, currentWords: ["", "", ""], currentWordIndex: 0 };
      for (const l of word) s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
      for (const l of word) s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
      for (const l of word) s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
      s = vresTinFrasiReducer(s, { type: "SUBMIT_GUESS", validWords: VALID_WORDS });
    }
    expect(s.guesses).toHaveLength(6);
    expect(s.status).toBe("lost");
  });

  it("short words (2–3 letters) are accepted (e.g. 'και')", () => {
    const puzzle3: VresTinFrasiPuzzle = {
      id:             "2026-05-28-vresi",
      date:           "2026-05-28",
      phrase:         "Αρετή και αρετή",
      normalizedWords: ["αρετη", "και", "αρετη"],
      wordLengths:    [5, 3, 5],
    };
    let s = makeInitialVresTinFrasiState(puzzle3);
    for (const l of ["α", "ρ", "ε", "τ", "η"]) s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
    for (const l of ["κ", "α", "ι"])            s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
    for (const l of ["α", "ρ", "ε", "τ", "η"]) s = vresTinFrasiReducer(s, { type: "ADD_LETTER", letter: l });
    s = vresTinFrasiReducer(s, { type: "SUBMIT_GUESS", validWords: new Set(["αρετη", "και"]) });
    expect(s.guesses).toHaveLength(1); // accepted — "και" is in words-el-short.json
  });
});

describe("vresTinFrasiReducer — RESTORE_STATE", () => {
  it("restores guesses and status, resets input", () => {
    let s = vresTinFrasiReducer(initState(), { type: "ADD_LETTER", letter: "κ" });
    s = vresTinFrasiReducer(s, {
      type:    "RESTORE_STATE",
      guesses: [{ words: ["καλη", "μερα", "φιλε"], tiles: [[],[],[]] }],
      status:  "won",
    });
    expect(s.guesses).toHaveLength(1);
    expect(s.status).toBe("won");
    expect(s.currentWords).toEqual(["", "", ""]);
    expect(s.currentWordIndex).toBe(0);
  });
});
