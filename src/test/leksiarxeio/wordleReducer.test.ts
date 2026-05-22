// Unit tests for wordleReducer.

import { WordleAction, makeInitialWordleState, wordleReducer } from "@/games/leksiarxeio/hooks/wordleReducer";
import { describe, expect, it } from "vitest";

import type { WordleState } from "@/games/leksiarxeio/types";

const PUZZLE = {
  id: "test-puzzle",
  date: "2025-01-01",
  answer: "αβγδε",
  length: 5 as const,
};

const VALID_WORDS = new Set(["αβγδε", "αζηθι", "κλμνξ"]);

function fresh(): WordleState {
  return makeInitialWordleState(PUZZLE);
}

function dispatch(state: WordleState, action: WordleAction): WordleState {
  return wordleReducer(state, action);
}

describe("wordleReducer — ADD_LETTER", () => {
  it("appends a letter to currentInput", () => {
    const s = dispatch(fresh(), { type: "ADD_LETTER", letter: "α" });
    expect(s.currentInput).toBe("α");
  });

  it("does not exceed word length", () => {
    let s = fresh();
    for (const l of ["α", "β", "γ", "δ", "ε", "ζ"]) {
      s = dispatch(s, { type: "ADD_LETTER", letter: l });
    }
    expect(s.currentInput).toBe("αβγδε"); // capped at 5
  });

  it("ignores input when game is won", () => {
    const s: WordleState = { ...fresh(), status: "won" };
    expect(dispatch(s, { type: "ADD_LETTER", letter: "α" }).currentInput).toBe("");
  });
});

describe("wordleReducer — DELETE_LETTER", () => {
  it("removes the last letter", () => {
    let s = dispatch(fresh(), { type: "ADD_LETTER", letter: "α" });
    s = dispatch(s, { type: "DELETE_LETTER" });
    expect(s.currentInput).toBe("");
  });

  it("is a no-op on empty input", () => {
    const s = dispatch(fresh(), { type: "DELETE_LETTER" });
    expect(s.currentInput).toBe("");
  });
});

describe("wordleReducer — SUBMIT_GUESS", () => {
  function typeWord(state: WordleState, word: string): WordleState {
    let s = state;
    for (const l of word) s = dispatch(s, { type: "ADD_LETTER", letter: l });
    return s;
  }

  it("rejects short guesses", () => {
    let s = dispatch(fresh(), { type: "ADD_LETTER", letter: "α" });
    s = dispatch(s, { type: "SUBMIT_GUESS", validWords: VALID_WORDS });
    expect(s.lastMessage).toMatch(/γράμματα/i);
    expect(s.guesses).toHaveLength(0);
  });

  it("rejects words not in valid list", () => {
    let s = typeWord(fresh(), "ωωωωω");
    s = dispatch(s, { type: "SUBMIT_GUESS", validWords: VALID_WORDS });
    expect(s.lastMessage).toMatch(/λίστα/i);
    expect(s.guesses).toHaveLength(0);
  });

  it("accepts valid guess and evaluates tiles", () => {
    let s = typeWord(fresh(), "αζηθι");
    s = dispatch(s, { type: "SUBMIT_GUESS", validWords: VALID_WORDS });
    expect(s.guesses).toHaveLength(1);
    expect(s.guesses[0].word).toBe("αζηθι");
    expect(s.guesses[0].tiles[0]).toBe("correct"); // α in position 0
  });

  it("transitions to won when guess matches answer", () => {
    let s = typeWord(fresh(), "αβγδε");
    s = dispatch(s, { type: "SUBMIT_GUESS", validWords: VALID_WORDS });
    expect(s.status).toBe("won");
    expect(s.currentInput).toBe("");
  });

  it("transitions to lost after 6 failed guesses", () => {
    let s = fresh();
    for (let i = 0; i < 6; i++) {
      s = typeWord(s, "κλμνξ"); // wrong but valid
      s = dispatch(s, { type: "SUBMIT_GUESS", validWords: VALID_WORDS });
    }
    expect(s.status).toBe("lost");
    expect(s.guesses).toHaveLength(6);
  });
});

describe("wordleReducer — RESTORE_STATE", () => {
  it("restores guesses and status", () => {
    const s = dispatch(fresh(), {
      type: "RESTORE_STATE",
      guesses: [{ word: "αζηθι", tiles: ["correct", "absent", "absent", "absent", "absent"] }],
      status: "playing",
    });
    expect(s.guesses).toHaveLength(1);
    expect(s.status).toBe("playing");
    expect(s.currentInput).toBe("");
  });
});
