// wordleGuessGrid.test.tsx
// Tests for GuessGrid: tile sizing and layout consistency across word lengths.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { GuessGrid } from "@/components/leksiarxeio/GuessGrid";
import type { GuessResult } from "@/games/leksiarxeio/types";

const NO_GUESSES: GuessResult[] = [];

// ── No inline submit button ────────────────────────────────────────────────────

describe("GuessGrid — no inline submit button", () => {
  it("never renders an inline-submit button regardless of input", () => {
    render(
      <GuessGrid
        guesses={NO_GUESSES}
        currentInput="αβγδε"
        wordLength={5}
      />
    );
    expect(screen.queryByTestId("inline-submit")).toBeNull();
  });
});

// ── Tile sizing ───────────────────────────────────────────────────────────────

// Tiles are flex-1 aspect-square so each tile is naturally square at every level.
// The grid container has a per-length max-width so narrower word counts don't
// produce landscape-rectangle tiles. The keyboard stays full max-w-sm.
describe("GuessGrid — flex-fill tile sizing", () => {
  const EXPECTED_CLASSES = ["flex-1", "aspect-square"];

  for (const length of [4, 5, 6, 7, 8]) {
    it(`applies ${EXPECTED_CLASSES.join(" ")} tiles for word length ${length}`, () => {
      const { container } = render(
        <GuessGrid
          guesses={NO_GUESSES}
          currentInput=""
          wordLength={length}
        />
      );
      const firstTile = container.querySelector("[role='row'] > div");
      expect(firstTile).not.toBeNull();
      for (const cls of EXPECTED_CLASSES) {
        expect((firstTile as HTMLElement).className).toContain(cls);
      }
    });
  }
});

// ── Grid max-width per word length ───────────────────────────────────────────

// The grid container is capped at N*48 + (N-1)*6 px per word length so tiles
// stay naturally square even at low word counts (4-letter = 210 px, etc.).
describe("GuessGrid — grid max-width per word length", () => {
  const EXPECTED_MAX_WIDTHS: Record<number, string> = {
    4: "max-w-[210px]",
    5: "max-w-[264px]",
    6: "max-w-[318px]",
    7: "max-w-[372px]",
    8: "max-w-full",
  };

  for (const [length, maxWClass] of Object.entries(EXPECTED_MAX_WIDTHS)) {
    it(`grid container has ${maxWClass} for word length ${length}`, () => {
      const { container } = render(
        <GuessGrid
          guesses={NO_GUESSES}
          currentInput=""
          wordLength={Number(length)}
        />
      );
      const grid = container.querySelector("[role='grid']");
      expect(grid).not.toBeNull();
      expect((grid as HTMLElement).className).toContain(maxWClass);
    });
  }
});

// ── Keyboard max-width ────────────────────────────────────────────────────────

describe("Keyboard — full width", () => {
  it("keyboard container has w-full class", async () => {
    const { Keyboard } = await import("@/components/leksiarxeio/Keyboard");
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
    expect((kb as HTMLElement).className).toContain("w-full");
  });
});
