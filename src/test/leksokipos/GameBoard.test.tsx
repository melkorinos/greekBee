// Component tests for GameBoard — tests real user interactions using RTL.
// Verifies that clicking hexes, typing, submitting and error messages all work.

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { GameBoard } from "@/components/leksokipos/GameBoard";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";
import { RANKS } from "@/games/leksokipos/lib/ranking";
import userEvent from "@testing-library/user-event";

// GameBoard calls useDayChange → useRouter; provide a stub so it doesn't throw.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

// ── Test fixture ───────────────────────────────────────────────────────────────

const puzzle: LeksokiposPuzzle = {
  id: "test-puzzle",
  language: "el",
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

  it("renders Delete, Shuffle buttons (no submit button when input is empty)", () => {
    setup();
    expect(screen.getByTestId("btn-delete")).toBeInTheDocument();
    expect(screen.getByTestId("btn-shuffle")).toBeInTheDocument();
    expect(screen.queryByTestId("btn-enter")).toBeNull();
  });

  it("shows the inline submit button once the input reaches 4 letters", async () => {
    const { user } = setup();
    // Type 3 letters — button should still be absent
    await user.keyboard("pai");
    expect(screen.queryByTestId("btn-enter")).toBeNull();
    // Type the 4th letter — button should appear
    await user.keyboard("n");
    expect(screen.getByTestId("btn-enter")).toBeInTheDocument();
  });

  it("renders the score bar with the starting rank", () => {
    setup();
    expect(screen.getByTestId("rank-label")).toHaveTextContent(RANKS[0].name);
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

  it("Enter button submits the current word", async () => {
    const { user } = setup();
    await user.keyboard("anti"); // use a different word than other tests
    await user.click(screen.getByTestId("btn-enter"));
    expect(screen.getByTestId("found-words-count")).toHaveTextContent("1");
  });
});

// ── Word suggestion flow ───────────────────────────────────────────────────────

describe("Word suggestion flow", () => {
  function mockFetch(ok: boolean) {
    return vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok,
      json: async () => ({ ok }),
    } as Response);
  }

  it("shows the suggest button after a not_in_list submission", async () => {
    const { user } = setup();
    await user.keyboard("panda{Enter}"); // not in validWords
    expect(screen.getByTestId("feedback-suggest-btn")).toBeInTheDocument();
  });

  it("opens the suggest modal when the suggest button is clicked", async () => {
    const { user } = setup();
    await user.keyboard("panda{Enter}");
    await user.click(screen.getByTestId("feedback-suggest-btn"));
    expect(screen.getByTestId("nomination-modal")).toBeInTheDocument();
  });

  it("shows confirmation feedback after a successful suggestion", async () => {
    mockFetch(true);
    const { user } = setup();
    await user.keyboard("panda{Enter}");
    await user.click(screen.getByTestId("feedback-suggest-btn"));
    await user.click(screen.getByTestId("nomination-modal-submit"));
    // modal closes immediately on success; feedback area shows confirmation
    await waitFor(() =>
      expect(screen.getByTestId("feedback-just-suggested")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("feedback-just-suggested")).toHaveTextContent("PANDA");
  });

  it("shows 'Ήδη υποβλήθηκε' for a word already suggested in a previous session", async () => {
    // Pre-seed localStorage as if the word was suggested before
    const { writeSlice, readSlice } = await import("@/hooks/useGameStore");
    const existing = readSlice<string[]>("suggestions") ?? [];
    writeSlice("suggestions", [...existing, "panda"]);

    const { user } = setup();
    await user.keyboard("panda{Enter}");
    expect(screen.getByTestId("feedback-already-suggested")).toBeInTheDocument();
    expect(screen.queryByTestId("feedback-suggest-btn")).toBeNull();
  });
});

// ── Give-up ───────────────────────────────────────────────────────────────────

describe("Give-up flow", () => {
  it("shows give-up button in found-words heading for daily puzzle", () => {
    render(<GameBoard puzzle={{ ...puzzle, id: "2026-05-20-el", date: "2026-05-20" }} />);
    expect(screen.getByTestId("btn-give-up")).toBeInTheDocument();
  });

  it("does NOT show give-up button for custom puzzles", () => {
    render(<GameBoard puzzle={{ ...puzzle, id: "custom-a-pinteδ", date: "2026-05-20" }} />);
    expect(screen.queryByTestId("btn-give-up")).toBeNull();
  });

  it("clicking give-up shows confirmation row", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={{ ...puzzle, id: "2026-05-20-el", date: "2026-05-20" }} />);
    await user.click(screen.getByTestId("btn-give-up"));
    expect(screen.getByTestId("btn-give-up-confirm")).toBeInTheDocument();
    expect(screen.getByTestId("btn-give-up-cancel")).toBeInTheDocument();
  });

  it("cancelling give-up hides confirmation and restores give-up button", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={{ ...puzzle, id: "2026-05-20-el", date: "2026-05-20" }} />);
    await user.click(screen.getByTestId("btn-give-up"));
    await user.click(screen.getByTestId("btn-give-up-cancel"));
    expect(screen.getByTestId("btn-give-up")).toBeInTheDocument();
    expect(screen.queryByTestId("btn-give-up-confirm")).toBeNull();
  });

  it("confirming give-up shows the game-over banner and missed-words list", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={{ ...puzzle, id: "2026-05-20-el", date: "2026-05-20" }} />);
    await user.click(screen.getByTestId("btn-give-up"));
    await user.click(screen.getByTestId("btn-give-up-confirm"));
    await waitFor(() => expect(screen.getByTestId("give-up-banner")).toBeInTheDocument());
    expect(screen.getByTestId("missed-words-list")).toBeInTheDocument();
  });

  it("hides the honeycomb and action buttons after confirming give-up", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={{ ...puzzle, id: "2026-05-20-el", date: "2026-05-20" }} />);
    await user.click(screen.getByTestId("btn-give-up"));
    await user.click(screen.getByTestId("btn-give-up-confirm"));
    await waitFor(() => expect(screen.getByTestId("give-up-banner")).toBeInTheDocument());
    expect(screen.queryByTestId("btn-delete")).toBeNull();
    expect(screen.queryByTestId("btn-shuffle")).toBeNull();
  });

  it("missed-words list excludes already-found words", async () => {
    const user = userEvent.setup();
    render(<GameBoard puzzle={{ ...puzzle, id: "2026-05-20-el", date: "2026-05-20" }} />);
    // Find a word first
    await user.keyboard("anti{Enter}");
    await user.click(screen.getByTestId("btn-give-up"));
    await user.click(screen.getByTestId("btn-give-up-confirm"));
    await waitFor(() => expect(screen.getByTestId("missed-words-list")).toBeInTheDocument());
    // "anti" should not appear in missed list
    const missedList = screen.getByTestId("missed-words-list");
    expect(missedList).not.toHaveTextContent("anti");
  });
});

// ── Leaderboard button location ────────────────────────────────────────────────

describe("Leaderboard button", () => {
  it("renders inside ScoreBar (next to score) for daily puzzles", () => {
    render(<GameBoard puzzle={{ ...puzzle, id: "2026-05-20-el", date: "2026-05-20" }} />);
    const scoreBar = screen.getByTestId("score-bar");
    expect(scoreBar.querySelector('[data-testid="btn-leaderboard"]')).toBeInTheDocument();
  });

  it("is absent for non-daily (custom) puzzles", () => {
    setup();
    expect(screen.queryByTestId("btn-leaderboard")).toBeNull();
  });
});
