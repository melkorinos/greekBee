// connectionsReducer.test.ts — unit tests for Connections game reducer.

import type { ConnectionsPuzzle, ConnectionsState } from "@/games/connections/types";
import { describe, expect, it } from "vitest";

import { connectionsReducer } from "@/games/connections/hooks/connectionsReducer";

// ── Fixture ───────────────────────────────────────────────────────────────────

const PUZZLE: ConnectionsPuzzle = {
  date: "2026-05-12",
  groups: [
    { category: "Χρώματα",  words: ["κόκκινο", "μπλε", "πράσινο", "κίτρινο"],  difficulty: 1 },
    { category: "Ζώα",      words: ["σκύλος",  "γάτα",  "άλογο",   "ψάρι"],     difficulty: 2 },
    { category: "Φρούτα",   words: ["μήλο",    "πορτοκάλι", "σταφύλι", "μπανάνα"], difficulty: 3 },
    { category: "Πράξεις",  words: ["άθροισμα","γινόμενο","διαφορά","πηλίκο"],  difficulty: 4 },
  ],
};

function freshState(): ConnectionsState {
  return {
    puzzle:            PUZZLE,
    solvedGroups:      [],
    currentSelection:  [],
    mistakesRemaining: 4,
    status:            "playing",
    lastFeedback:      null,
    guessHistory:      [],
  };
}

// ── SELECT_WORD ───────────────────────────────────────────────────────────────

describe("SELECT_WORD", () => {
  it("adds a word to the selection", () => {
    const state = connectionsReducer(freshState(), { type: "SELECT_WORD", word: "κόκκινο" });
    expect(state.currentSelection).toContain("κόκκινο");
  });

  it("deselects an already-selected word", () => {
    const s1 = connectionsReducer(freshState(), { type: "SELECT_WORD", word: "κόκκινο" });
    const s2 = connectionsReducer(s1, { type: "SELECT_WORD", word: "κόκκινο" });
    expect(s2.currentSelection).not.toContain("κόκκινο");
  });

  it("does not allow more than 4 words", () => {
    let s = freshState();
    for (const w of ["κόκκινο", "μπλε", "πράσινο", "κίτρινο"]) {
      s = connectionsReducer(s, { type: "SELECT_WORD", word: w });
    }
    const s2 = connectionsReducer(s, { type: "SELECT_WORD", word: "σκύλος" });
    expect(s2.currentSelection).toHaveLength(4);
    expect(s2.currentSelection).not.toContain("σκύλος");
  });
});

// ── SUBMIT_GUESS — correct ────────────────────────────────────────────────────

describe("SUBMIT_GUESS — correct group", () => {
  function stateWithSelection(words: string[]): ConnectionsState {
    return { ...freshState(), currentSelection: words };
  }

  it("marks the group as solved and clears selection", () => {
    const s = connectionsReducer(
      stateWithSelection(["κόκκινο", "μπλε", "πράσινο", "κίτρινο"]),
      { type: "SUBMIT_GUESS" },
    );
    expect(s.solvedGroups).toHaveLength(1);
    expect(s.solvedGroups[0].category).toBe("Χρώματα");
    expect(s.currentSelection).toHaveLength(0);
  });

  it("sets status to won after all 4 groups are solved", () => {
    let s = freshState();
    for (const group of PUZZLE.groups) {
      s = { ...s, currentSelection: [...group.words] };
      s = connectionsReducer(s, { type: "SUBMIT_GUESS" });
    }
    expect(s.status).toBe("won");
  });
});

// ── SUBMIT_GUESS — wrong ──────────────────────────────────────────────────────

describe("SUBMIT_GUESS — wrong guess", () => {
  it("decrements mistakesRemaining by 1", () => {
    const s = connectionsReducer(
      { ...freshState(), currentSelection: ["κόκκινο", "σκύλος", "μήλο", "άθροισμα"] },
      { type: "SUBMIT_GUESS" },
    );
    expect(s.mistakesRemaining).toBe(3);
  });

  it("sets status to lost when mistakes reach 0", () => {
    // 4 genuinely unique wrong guesses (no valid group in any)
    const wrongGuesses = [
      ["κόκκινο", "σκύλος", "μήλο", "άθροισμα"],
      ["μπλε",    "γάτα",   "πορτοκάλι", "γινόμενο"],
      ["πράσινο", "άλογο",  "σταφύλι",   "διαφορά"],
      ["κίτρινο", "ψάρι",   "μπανάνα",   "πηλίκο"],
    ];
    let s = freshState();
    for (const guess of wrongGuesses) {
      s = { ...s, currentSelection: guess };
      s = connectionsReducer(s, { type: "SUBMIT_GUESS" });
    }
    expect(s.status).toBe("lost");
  });

  it("does not submit when fewer than 4 words selected", () => {
    const s = connectionsReducer(
      { ...freshState(), currentSelection: ["κόκκινο", "μπλε"] },
      { type: "SUBMIT_GUESS" },
    );
    expect(s.mistakesRemaining).toBe(4);
  });

  it("blocks already-guessed combinations", () => {
    const guess = ["κόκκινο", "σκύλος", "μήλο", "άθροισμα"];
    let s = { ...freshState(), currentSelection: guess };
    s = connectionsReducer(s, { type: "SUBMIT_GUESS" });
    s = { ...s, currentSelection: guess };
    s = connectionsReducer(s, { type: "SUBMIT_GUESS" });
    // Second submit should not decrement mistakes
    expect(s.mistakesRemaining).toBe(3);
    expect(s.lastFeedback).toContain("ήδη");
  });
});

// ── CLEAR_FEEDBACK ────────────────────────────────────────────────────────────

describe("CLEAR_FEEDBACK", () => {
  it("clears the lastFeedback", () => {
    const s = connectionsReducer(
      { ...freshState(), lastFeedback: "some message" },
      { type: "CLEAR_FEEDBACK" },
    );
    expect(s.lastFeedback).toBeNull();
  });
});

// ── Terminal state guard ──────────────────────────────────────────────────────

describe("Terminal state guard", () => {
  it("ignores SELECT_WORD when game is won", () => {
    const s: ConnectionsState = { ...freshState(), status: "won" };
    const s2 = connectionsReducer(s, { type: "SELECT_WORD", word: "κόκκινο" });
    expect(s2.currentSelection).toHaveLength(0);
  });
});
