// roundEnd.test.tsx — when Βρες τη Φράση's Result Panel appears (ADR 0025).
//
// Round End is `status` leaving `playing`, and that means a LOST round shares
// too: Wordle's X/6 is posted as often as a win, and a summary that only shows up
// when the player won reads as bragging rather than playing.

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { VresTinFrasiBoard } from "@/components/vrestifrasi/VresTinFrasiBoard";
import type { VresTinFrasiPuzzle } from "@/games/vrestifrasi/types";

const TODAY = "2026-08-17";
const PHRASE = "Κάθε ζωή έχει νόημα";
const WORDS = PHRASE.toLowerCase().split(" ");

const PUZZLE: VresTinFrasiPuzzle = {
  id:              `${TODAY}-vresi`,
  date:            TODAY,
  phrase:          PHRASE,
  normalizedWords: WORDS,
  wordLengths:     WORDS.map((w) => w.length),
};

function seedSession(status: "won" | "lost") {
  const guess = (correct: boolean) => ({
    words: WORDS,
    tiles: WORDS.map((w) => Array(w.length).fill(correct ? "correct" : "absent")),
  });
  const guesses = status === "won" ? [guess(true)] : Array.from({ length: 6 }, () => guess(false));

  localStorage.setItem(
    "wordgames:state",
    JSON.stringify({ vrestifrasi: { [PUZZLE.id]: { guesses, status } } }),
  );
}

function renderBoard() {
  return render(
    <VresTinFrasiBoard
      puzzle={PUZZLE}
      validWords={WORDS}
      today={TODAY}
    />,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("Vres Tin Frasi Round End", () => {
  it("shows no Result Panel while the round is still playing", () => {
    renderBoard();
    expect(screen.queryByTestId("vrestifrasi-result")).not.toBeInTheDocument();
  });

  it("shows the Result Panel on a win", () => {
    seedSession("won");
    renderBoard();
    expect(screen.getByTestId("vrestifrasi-result")).toBeInTheDocument();
  });

  it("shows the Result Panel on a loss", () => {
    seedSession("lost");
    renderBoard();
    expect(screen.getByTestId("vrestifrasi-result")).toBeInTheDocument();
  });

  // The panel states the verdict rather than printing the phrase (2026-08-21).
  // On a loss that means the phrase stays unrevealed — deliberate, and the reason
  // this test asserts its ABSENCE where it once asserted the reveal.
  it("says the phrase was found on a win", () => {
    seedSession("won");
    renderBoard();

    expect(screen.getByTestId("vrestifrasi-result")).toHaveTextContent("Βρήκες τη φράση");
  });

  it("says the phrase was not found on a loss, and does not print it", () => {
    seedSession("lost");
    renderBoard();

    const panel = screen.getByTestId("vrestifrasi-result");
    expect(panel).toHaveTextContent("Δεν βρήκες τη φράση");
    expect(panel).not.toHaveTextContent(PHRASE);
  });

  // ADR 0027: the Game has no scoring and no leaderboard, so the panel it renders
  // has neither the πόντοι heading nor the link — and no 🏆 anywhere on the page.
  it("shows no score heading and no leaderboard link", () => {
    seedSession("won");
    renderBoard();

    const panel = screen.getByTestId("vrestifrasi-result");
    expect(panel).not.toHaveTextContent(/πόντοι/i);
    expect(screen.queryByRole("button", { name: /πίνακα σκορ/i })).not.toBeInTheDocument();
  });
});
