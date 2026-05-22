// Unit tests for the game reducer — fast, no React, no DOM.
// Tests every action type directly through the reducer's interface.

import type { GameState, SpellingBeePuzzle } from "@/games/leksokipos/types";
import { buildInitialState, gameReducer } from "@/games/leksokipos/hooks/gameReducer";
import { describe, expect, it } from "vitest";

import { maxScore } from "@/games/leksokipos/lib/scoring";

// ── Shared test fixture ────────────────────────────────────────────────────────

const puzzle: SpellingBeePuzzle = {
  id: "test-reducer",
  language: "el",
  date: "2026-01-01",
  centerLetter: "a",
  outerLetters: ["p", "i", "n", "t", "e", "d"],
  validWords: ["anti", "paid", "paint", "painted", "panted", "patina"],
};

function freshState(): GameState {
  return buildInitialState(puzzle);
}

// ── buildInitialState ──────────────────────────────────────────────────────────

describe("buildInitialState", () => {
  it("starts with empty input, no words and zero score", () => {
    const s = freshState();
    expect(s.currentInput).toBe("");
    expect(s.foundWords).toEqual([]);
    expect(s.score).toBe(0);
  });

  it("sets puzzleMaxScore from the puzzle's valid words", () => {
    const s = freshState();
    expect(s.puzzleMaxScore).toBe(maxScore(puzzle));
    expect(s.puzzleMaxScore).toBeGreaterThan(0);
  });

  it("starts at Σπόρος rank", () => {
    const s = freshState();
    expect(s.currentRank).toBe("Σπόρος");
  });

  it("stores the puzzle on state", () => {
    const s = freshState();
    expect(s.puzzle.id).toBe(puzzle.id);
  });
});

// ── ADD_LETTER ─────────────────────────────────────────────────────────────────

describe("ADD_LETTER", () => {
  it("appends a letter to currentInput", () => {
    const s = gameReducer(freshState(), { type: "ADD_LETTER", letter: "p" });
    expect(s.currentInput).toBe("p");
  });

  it("appends multiple letters in sequence", () => {
    let s = freshState();
    for (const letter of ["p", "a", "i", "n", "t"]) {
      s = gameReducer(s, { type: "ADD_LETTER", letter });
    }
    expect(s.currentInput).toBe("paint");
  });

  it("does not mutate other state fields", () => {
    const before = freshState();
    const after = gameReducer(before, { type: "ADD_LETTER", letter: "a" });
    expect(after.score).toBe(before.score);
    expect(after.foundWords).toBe(before.foundWords);
  });
});

// ── DELETE_LETTER ──────────────────────────────────────────────────────────────

describe("DELETE_LETTER", () => {
  it("removes the last letter", () => {
    let s = gameReducer(freshState(), { type: "ADD_LETTER", letter: "p" });
    s = gameReducer(s, { type: "ADD_LETTER", letter: "a" });
    s = gameReducer(s, { type: "DELETE_LETTER" });
    expect(s.currentInput).toBe("p");
  });

  it("is a no-op on empty input", () => {
    const s = gameReducer(freshState(), { type: "DELETE_LETTER" });
    expect(s.currentInput).toBe("");
  });
});

// ── CLEAR_INPUT ────────────────────────────────────────────────────────────────

describe("CLEAR_INPUT", () => {
  it("empties the current input", () => {
    let s = freshState();
    for (const letter of ["p", "a", "i", "n"]) {
      s = gameReducer(s, { type: "ADD_LETTER", letter });
    }
    s = gameReducer(s, { type: "CLEAR_INPUT" });
    expect(s.currentInput).toBe("");
  });

  it("does not change score or found words", () => {
    const before = freshState();
    const after = gameReducer(before, { type: "CLEAR_INPUT" });
    expect(after.score).toBe(before.score);
    expect(after.foundWords).toEqual(before.foundWords);
  });
});

// ── SUBMIT_WORD ────────────────────────────────────────────────────────────────

describe("SUBMIT_WORD — valid word", () => {
  function submitWord(word: string, state = freshState()): GameState {
    let s = state;
    for (const letter of word) {
      s = gameReducer(s, { type: "ADD_LETTER", letter });
    }
    return gameReducer(s, { type: "SUBMIT_WORD" });
  }

  it("adds the word to foundWords", () => {
    const s = submitWord("paint");
    expect(s.foundWords).toContain("paint");
  });

  it("clears the input after submission", () => {
    const s = submitWord("paint");
    expect(s.currentInput).toBe("");
  });

  it("awards the correct points", () => {
    const s = submitWord("paint"); // 5 letters = 5 pts
    expect(s.score).toBe(5);
  });

  it("advances the rank when threshold is crossed", () => {
    // Submit all words to accumulate enough score for a rank-up
    let s = freshState();
    for (const word of puzzle.validWords) {
      s = submitWord(word, s);
    }
    expect(s.currentRank).not.toBe("Σπόρος");
  });

  it("records lastSubmission with status valid", () => {
    const s = submitWord("paint");
    expect(s.lastSubmission?.result.status).toBe("valid");
    expect(s.lastSubmission?.word).toBe("paint");
  });
});

describe("SUBMIT_WORD — invalid word", () => {
  it("rejects a word not in the list", () => {
    let s = freshState();
    for (const letter of ["p", "a", "n", "d", "a"]) {
      s = gameReducer(s, { type: "ADD_LETTER", letter });
    }
    s = gameReducer(s, { type: "SUBMIT_WORD" });
    expect(s.lastSubmission?.result.status).toBe("not_in_list");
    expect(s.score).toBe(0);
    expect(s.foundWords).toHaveLength(0);
  });

  it("rejects a duplicate word", () => {
    let s = freshState();
    for (const letter of ["p", "a", "i", "n", "t"]) {
      s = gameReducer(s, { type: "ADD_LETTER", letter });
    }
    s = gameReducer(s, { type: "SUBMIT_WORD" });
    const scoreAfterFirst = s.score;
    for (const letter of ["p", "a", "i", "n", "t"]) {
      s = gameReducer(s, { type: "ADD_LETTER", letter });
    }
    s = gameReducer(s, { type: "SUBMIT_WORD" });
    expect(s.lastSubmission?.result.status).toBe("already_found");
    expect(s.score).toBe(scoreAfterFirst);
  });
});

// ── SHUFFLE_LETTERS ────────────────────────────────────────────────────────────

describe("SHUFFLE_LETTERS", () => {
  it("preserves the same set of outer letters", () => {
    const before = freshState();
    const after = gameReducer(before, { type: "SHUFFLE_LETTERS" });
    expect([...after.puzzle.outerLetters].sort()).toEqual(
      [...before.puzzle.outerLetters].sort()
    );
  });

  it("does not change the center letter", () => {
    const before = freshState();
    const after = gameReducer(before, { type: "SHUFFLE_LETTERS" });
    expect(after.puzzle.centerLetter).toBe(before.puzzle.centerLetter);
  });

  it("does not change score or found words", () => {
    const before = freshState();
    const after = gameReducer(before, { type: "SHUFFLE_LETTERS" });
    expect(after.score).toBe(before.score);
    expect(after.foundWords).toEqual(before.foundWords);
  });
});

// ── NEW_GAME ───────────────────────────────────────────────────────────────────

describe("NEW_GAME", () => {
  it("resets all progress", () => {
    let s = freshState();
    for (const letter of ["p", "a", "i", "n", "t"]) {
      s = gameReducer(s, { type: "ADD_LETTER", letter });
    }
    s = gameReducer(s, { type: "SUBMIT_WORD" });

    const newPuzzle: SpellingBeePuzzle ={ ...puzzle, id: "new-puzzle" };
    s = gameReducer(s, { type: "NEW_GAME", puzzle: newPuzzle });

    expect(s.score).toBe(0);
    expect(s.foundWords).toHaveLength(0);
    expect(s.currentInput).toBe("");
    expect(s.currentRank).toBe("Σπόρος");
    expect(s.puzzle.id).toBe("new-puzzle");
  });

  it("sets puzzleMaxScore for the new puzzle", () => {
    const newPuzzle: SpellingBeePuzzle ={ ...puzzle, id: "new-puzzle" };
    const s = gameReducer(freshState(), { type: "NEW_GAME", puzzle: newPuzzle });
    expect(s.puzzleMaxScore).toBe(maxScore(newPuzzle));
  });
});

// ── RESTORE_STATE ──────────────────────────────────────────────────────────────

describe("RESTORE_STATE", () => {
  it("merges saved fields into current state", () => {
    const s = gameReducer(freshState(), {
      type: "RESTORE_STATE",
      saved: {
        foundWords: ["anti", "paid"],
        score: 2,
        currentRank: "Βλαστός",
      },
    });
    expect(s.foundWords).toEqual(["anti", "paid"]);
    expect(s.score).toBe(2);
    expect(s.currentRank).toBe("Βλαστός");
  });

  it("preserves puzzleMaxScore from the initial state", () => {
    const initial = freshState();
    const s = gameReducer(initial, {
      type: "RESTORE_STATE",
      saved: { score: 5 },
    });
    expect(s.puzzleMaxScore).toBe(initial.puzzleMaxScore);
  });
});

// ── GIVE_UP ────────────────────────────────────────────────────────────────────

describe("GIVE_UP", () => {
  it("sets givenUp to true", () => {
    const s = gameReducer(freshState(), { type: "GIVE_UP" });
    expect(s.givenUp).toBe(true);
  });

  it("clears currentInput when giving up", () => {
    let s = gameReducer(freshState(), { type: "ADD_LETTER", letter: "p" });
    s = gameReducer(s, { type: "ADD_LETTER", letter: "a" });
    s = gameReducer(s, { type: "GIVE_UP" });
    expect(s.currentInput).toBe("");
  });

  it("preserves foundWords and score when giving up", () => {
    let s = gameReducer(freshState(), { type: "ADD_LETTER", letter: "a" });
    s = gameReducer(s, { type: "ADD_LETTER", letter: "n" });
    s = gameReducer(s, { type: "ADD_LETTER", letter: "t" });
    s = gameReducer(s, { type: "ADD_LETTER", letter: "i" });
    s = gameReducer(s, { type: "SUBMIT_WORD" });
    const scoreBeforeGiveUp = s.score;
    s = gameReducer(s, { type: "GIVE_UP" });
    expect(s.foundWords).toContain("anti");
    expect(s.score).toBe(scoreBeforeGiveUp);
  });

  it("givenUp is false on fresh state", () => {
    expect(freshState().givenUp).toBeFalsy();
  });

  it("RESTORE_STATE can restore givenUp: true", () => {
    const s = gameReducer(freshState(), {
      type: "RESTORE_STATE",
      saved: { givenUp: true },
    });
    expect(s.givenUp).toBe(true);
  });
});
