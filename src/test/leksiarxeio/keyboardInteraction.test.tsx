// RTL tests verifying the on-screen Keyboard wires through to useLeksiarxeioState
// and produces visible tile-state changes — letter added, deleted, and submitted.

import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GuessGrid } from "@/components/leksiarxeio/GuessGrid";
import { Keyboard } from "@/components/leksiarxeio/Keyboard";
import { useLeksiarxeioState } from "@/games/leksiarxeio/hooks/useLeksiarxeioState";

// ── Shared fixtures ────────────────────────────────────────────────────────────

const PUZZLE = {
  id:     "test-keyboard",
  date:   "2026-01-01",
  answer: "αβγδε",
  length: 5 as const,
};
const VALID_WORDS = ["αβγδε", "αζηθι", "κλμνξ"];

// Minimal harness: real hook + GuessGrid + Keyboard.
// Avoids the full LeksiarxeioBoard (score submission, 5 panels, leaderboard).
function GameHarness() {
  const { guesses, currentInput, letterStates, addLetter, deleteLetter, submitGuess } =
    useLeksiarxeioState(PUZZLE, VALID_WORDS);
  return (
    <>
      <GuessGrid guesses={guesses} currentInput={currentInput} wordLength={5} />
      <Keyboard
        letterStates={letterStates}
        onLetter={addLetter}
        onDelete={deleteLetter}
        onEnter={submitGuess}
      />
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("on-screen keyboard — letter key", () => {
  it("clicking a letter key adds a pending tile for that letter to the guess row", async () => {
    const user = userEvent.setup();
    render(<GameHarness />);

    await user.click(screen.getByTestId("key-α"));

    // Tile aria-label is "${letter} ${state}" — Tile.tsx line 46
    expect(screen.getByLabelText("Α pending")).toBeInTheDocument();
  });
});

describe("on-screen keyboard — delete key", () => {
  it("clicking ⌫ removes the last pending tile from the guess row", async () => {
    const user = userEvent.setup();
    render(<GameHarness />);

    await user.click(screen.getByTestId("key-α"));
    expect(screen.getByLabelText("Α pending")).toBeInTheDocument();

    await user.click(screen.getByTestId("btn-delete"));

    expect(screen.queryByLabelText("Α pending")).toBeNull();
  });
});

describe("on-screen keyboard — enter key", () => {
  it("clicking ↵ with a full valid guess submits the row and tiles leave pending state", async () => {
    const user = userEvent.setup();
    render(<GameHarness />);

    // "αζηθι" is in VALID_WORDS; vs answer "αβγδε": α=correct, rest=absent
    for (const letter of ["α", "ζ", "η", "θ", "ι"]) {
      await user.click(screen.getByTestId(`key-${letter}`));
    }

    await user.click(screen.getByTestId("btn-enter"));

    expect(screen.getByLabelText("Α correct")).toBeInTheDocument();
    expect(screen.queryByLabelText("Α pending")).toBeNull();
  });
});
