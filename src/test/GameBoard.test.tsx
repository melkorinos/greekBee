// Component tests for GameBoard — tests real user interactions using RTL.
// Verifies that clicking hexes, typing, submitting and error messages all work.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { GameBoard } from "@/components/GameBoard";
import type { Puzzle } from "@/types";
import userEvent from "@testing-library/user-event";

// ── Test fixture ───────────────────────────────────────────────────────────────

const puzzle: Puzzle = {
  id: "test-puzzle",
  language: "en",
  date: "2026-01-01",
  centerLetter: "a",
  outerLetters: ["p", "i", "n", "t", "e", "d"],
  validWords: ["anti", "paid", "paint", "painted", "panted", "patina"],
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Render GameBoard and return userEvent instance (pointer + keyboard) */
function setup() {
  const user = userEvent.setup();
  render(<GameBoard puzzle={puzzle} />);
  return { user };
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe("GameBoard rendering", () => {
  it("renders the game board container", () => {
    setup();
    expect(screen.getByTestId("game-board")).toBeInTheDocument();
  });

  it("renders Delete, Shuffle and Enter buttons", () => {
    setup();
    expect(screen.getByTestId("btn-delete")).toBeInTheDocument();
    expect(screen.getByTestId("btn-shuffle")).toBeInTheDocument();
    expect(screen.getByTestId("btn-enter")).toBeInTheDocument();
  });

  it("renders the score bar with Beginner rank at start", () => {
    setup();
    expect(screen.getByTestId("rank-label")).toHaveTextContent("Beginner");
    expect(screen.getByTestId("score-label")).toHaveTextContent("0 pts");
  });

  it("renders the found words list empty at start", () => {
    setup();
    expect(screen.getByTestId("found-words-count")).toHaveTextContent("0");
  });
});

// ── Keyboard input ─────────────────────────────────────────────────────────────

describe("Keyboard input", () => {
  it("types puzzle letters into the word input", async () => {
    const { user } = setup();
    await user.keyboard("pain");
    // All 4 letters should appear as word-input-letter spans
    const letters = screen.getAllByTestId("word-input-letter");
    expect(letters).toHaveLength(4);
  });

  it("ignores letters not in the puzzle", async () => {
    const { user } = setup();
    await user.keyboard("z"); // z is not in the puzzle
    expect(screen.queryAllByTestId("word-input-letter")).toHaveLength(0);
  });

  it("deletes the last letter on Backspace", async () => {
    const { user } = setup();
    await user.keyboard("pai");
    await user.keyboard("{Backspace}");
    expect(screen.getAllByTestId("word-input-letter")).toHaveLength(2);
  });
});

// ── Word submission ────────────────────────────────────────────────────────────

describe("Word submission", () => {
  it("accepts a valid word and adds it to found words", async () => {
    const { user } = setup();
    await user.keyboard("paint{Enter}");
    expect(screen.getByTestId("found-words-count")).toHaveTextContent("1");
    expect(screen.getByTestId("feedback-word-accepted")).toBeInTheDocument();
  });

  it("shows an error when word is too short", async () => {
    const { user } = setup();
    await user.keyboard("ant{Enter}");
    expect(screen.getByTestId("feedback-error-too_short")).toBeInTheDocument();
  });

  it("shows an error when word is missing the centre letter", async () => {
    const { user } = setup();
    await user.keyboard("pint{Enter}");
    expect(screen.getByTestId("feedback-error-missing_center")).toBeInTheDocument();
  });

  it("shows an error when word is not in the word list", async () => {
    const { user } = setup();
    await user.keyboard("panda{Enter}");
    expect(screen.getByTestId("feedback-error-not_in_list")).toBeInTheDocument();
  });

  it("shows an error when word was already found", async () => {
    const { user } = setup();
    await user.keyboard("paint{Enter}");
    await user.keyboard("paint{Enter}");
    expect(screen.getByTestId("feedback-error-already_found")).toBeInTheDocument();
  });

  it("highlights pangram submission", async () => {
    const { user } = setup();
    await user.keyboard("painted{Enter}");
    expect(screen.getByTestId("feedback-pangram")).toBeInTheDocument();
  });

  // was skipped due to localStorage bleed — fixed by beforeEach(localStorage.clear()) in setup.ts
  it("updates the score after a valid word", async () => {
    const { user } = setup();
    await user.keyboard("paint{Enter}"); // 5 pts
    expect(screen.getByTestId("score-label")).toHaveTextContent("5 pts");
  });
});

// ── Button interactions ────────────────────────────────────────────────────────

describe("Button interactions", () => {
  it("Delete button removes the last typed letter", async () => {
    const { user } = setup();
    await user.keyboard("pai");
    await user.click(screen.getByTestId("btn-delete"));
    expect(screen.getAllByTestId("word-input-letter")).toHaveLength(2);
  });

  // was skipped due to localStorage bleed — fixed by beforeEach(localStorage.clear()) in setup.ts
  it("Enter button submits the current word", async () => {
    const { user } = setup();
    await user.keyboard("anti"); // use a different word than other tests
    await user.click(screen.getByTestId("btn-enter"));
    expect(screen.getByTestId("found-words-count")).toHaveTextContent("1");
  });
});
