// wordleGuessGrid.test.tsx
// Tests for GuessGrid: inline submit button visibility/interaction,
// and responsive tile sizing based on word length.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { GuessGrid } from "@/components/wordle/GuessGrid";
import type { GuessResult } from "@/games/wordle/types";
import userEvent from "@testing-library/user-event";

const NO_GUESSES: GuessResult[] = [];

// ── Inline submit button ───────────────────────────────────────────────────────

describe("GuessGrid — inline submit button", () => {
  it("is hidden when currentInput is empty", () => {
    render(
      <GuessGrid
        guesses={NO_GUESSES}
        currentInput=""
        wordLength={5}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.queryByTestId("inline-submit")).toBeNull();
  });

  it("is hidden when currentInput is partially filled", () => {
    render(
      <GuessGrid
        guesses={NO_GUESSES}
        currentInput="αβγ"
        wordLength={5}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.queryByTestId("inline-submit")).toBeNull();
  });

  it("appears when currentInput is exactly wordLength", () => {
    render(
      <GuessGrid
        guesses={NO_GUESSES}
        currentInput="αβγδε"
        wordLength={5}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByTestId("inline-submit")).toBeDefined();
  });

  it("calls onSubmit when clicked", async () => {
    const onSubmit = vi.fn();
    render(
      <GuessGrid
        guesses={NO_GUESSES}
        currentInput="αβγδε"
        wordLength={5}
        onSubmit={onSubmit}
      />
    );
    await userEvent.click(screen.getByTestId("inline-submit"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("is not rendered when onSubmit is not provided", () => {
    render(
      <GuessGrid
        guesses={NO_GUESSES}
        currentInput="αβγδε"
        wordLength={5}
      />
    );
    expect(screen.queryByTestId("inline-submit")).toBeNull();
  });

  it("disappears after a guess is submitted (no active row when won)", () => {
    // Simulate a completed game: 1 guess submitted, no more active row
    const guesses: GuessResult[] = [
      { word: "αβγδε", tiles: ["correct", "correct", "correct", "correct", "correct"] },
      { word: "αβγδε", tiles: ["correct", "correct", "correct", "correct", "correct"] },
      { word: "αβγδε", tiles: ["correct", "correct", "correct", "correct", "correct"] },
      { word: "αβγδε", tiles: ["correct", "correct", "correct", "correct", "correct"] },
      { word: "αβγδε", tiles: ["correct", "correct", "correct", "correct", "correct"] },
      { word: "αβγδε", tiles: ["correct", "correct", "correct", "correct", "correct"] },
    ];
    render(
      <GuessGrid
        guesses={guesses}
        currentInput=""
        wordLength={5}
        onSubmit={vi.fn()}
      />
    );
    // Grid is full (6/6 guesses), no current row — submit button should not appear
    expect(screen.queryByTestId("inline-submit")).toBeNull();
  });
});

// ── Tile sizing ───────────────────────────────────────────────────────────────

describe("GuessGrid — responsive tile sizing", () => {
  const EXPECTED_SIZES: Record<number, string[]> = {
    4: ["w-16", "h-16"],
    5: ["w-14", "h-14"],
    6: ["w-12", "h-12"],
    7: ["w-10", "h-10"],
    8: ["w-9",  "h-9" ],
  };

  for (const [lengthStr, classes] of Object.entries(EXPECTED_SIZES)) {
    const length = Number(lengthStr);
    it(`applies ${classes.join(" ")} tiles for word length ${length}`, () => {
      const { container } = render(
        <GuessGrid
          guesses={NO_GUESSES}
          currentInput=""
          wordLength={length}
        />
      );
      // First tile in the grid
      const firstTile = container.querySelector("[role='row'] > div");
      expect(firstTile).not.toBeNull();
      for (const cls of classes) {
        expect((firstTile as HTMLElement).className).toContain(cls);
      }
    });
  }
});

// ── Keyboard max-width ────────────────────────────────────────────────────────

describe("Keyboard — constrained width", () => {
  it("keyboard container has max-w-sm class", async () => {
    const { Keyboard } = await import("@/components/wordle/Keyboard");
    const { container } = render(
      <Keyboard
        letterStates={{}}
        onLetter={() => {}}
        onDelete={() => {}}
        onEnter={() => {}}
      />
    );
    const kb = container.querySelector("[aria-label='Keyboard']");
    expect(kb).not.toBeNull();
    expect((kb as HTMLElement).className).toContain("max-w-sm");
  });
});
