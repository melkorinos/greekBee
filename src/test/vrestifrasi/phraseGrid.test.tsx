// phraseGrid.test.tsx — what the Vres Tin Frasi board must always show.
//
// s150 briefly dropped the unplayed rows to buy back vertical space after the
// tiles were enlarged. That was wrong: the six-row frame is how the player reads
// how many attempts are left, and a board that grows a row at a time shifts
// under the thumb on every submit. Both halves are locked here — the full frame
// on an untouched puzzle, and every played guess still on screen mid-round, so
// the clues from earlier tries stay readable while typing guess four.

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { PhraseGrid } from "@/components/vrestifrasi/PhraseGrid";
import type { PhraseGuessResult, PhraseTileState } from "@/games/vrestifrasi/types";

const WORD_LENGTHS = [3, 2];

function playedGuess(words: string[], state: PhraseTileState): PhraseGuessResult {
  return {
    words,
    tiles: words.map((w) => w.split("").map(() => state)),
  };
}

describe("PhraseGrid — rows on screen", () => {
  it("draws the full six-row frame on an untouched puzzle", () => {
    render(
      <PhraseGrid
        guesses={[]}
        currentWords={["", ""]}
        currentWordIndex={0}
        wordLengths={WORD_LENGTHS}
      />,
    );

    expect(screen.getAllByRole("row")).toHaveLength(6);
  });

  it("keeps every played guess visible while the next one is typed", () => {
    render(
      <PhraseGrid
        guesses={[
          playedGuess(["αβγ", "δε"], "absent"),
          playedGuess(["ζηθ", "ικ"], "present"),
          playedGuess(["λμν", "ξο"], "correct"),
        ]}
        currentWords={["πρσ", ""]}
        currentWordIndex={0}
        wordLengths={WORD_LENGTHS}
      />,
    );

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(6);

    // The three evaluated guesses, then the row being typed — in play order.
    expect(within(rows[0]).getByLabelText("Α absent")).toBeInTheDocument();
    expect(within(rows[1]).getByLabelText("Ζ present")).toBeInTheDocument();
    expect(within(rows[2]).getByLabelText("Λ correct")).toBeInTheDocument();
    expect(within(rows[3]).getByLabelText("Π pending")).toBeInTheDocument();
  });

  it("still shows the last guess after the board is full", () => {
    const guesses = Array.from({ length: 6 }, () => playedGuess(["αβγ", "δε"], "absent"));

    render(
      <PhraseGrid
        guesses={guesses}
        currentWords={["", ""]}
        currentWordIndex={0}
        wordLengths={WORD_LENGTHS}
      />,
    );

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(6);
    expect(within(rows[5]).getAllByLabelText("Α absent")).not.toHaveLength(0);
  });
});

// ── Word focus (2026-08-29) ──────────────────────────────────────────────────
// The board is typed as one unbroken run of letters, so a typo three words back
// cost every letter typed since. Tapping a word puts the cursor on it. Only the
// row being typed may be tapped, and the cursor has to be VISIBLE or the player
// cannot tell which word the next key writes into.
describe("PhraseGrid — tapping a word to move the cursor", () => {
  it("reports the tapped word's index, from any letter of that word", () => {
    const onFocusWord = vi.fn();
    render(
      <PhraseGrid
        guesses={[]}
        currentWords={["αβγ", "δε"]}
        currentWordIndex={1}
        wordLengths={WORD_LENGTHS}
        onFocusWord={onFocusWord}
      />,
    );

    const active = screen.getAllByRole("row")[0];
    // Third letter of word 0 — the index must come from the word, not the tile.
    fireEvent.click(within(active).getByLabelText("Γ pending"));
    expect(onFocusWord).toHaveBeenCalledWith(0);

    fireEvent.click(within(active).getByLabelText("Ε pending"));
    expect(onFocusWord).toHaveBeenLastCalledWith(1);
  });

  it("makes only the row being typed tappable", () => {
    render(
      <PhraseGrid
        guesses={[playedGuess(["αβγ", "δε"], "absent")]}
        currentWords={["ζηθ", ""]}
        currentWordIndex={0}
        wordLengths={WORD_LENGTHS}
        onFocusWord={vi.fn()}
      />,
    );

    const rows = screen.getAllByRole("row");
    // The played guess is history, and rows 2+ are not reached yet.
    expect(within(rows[0]).queryAllByRole("button")).toHaveLength(0);
    expect(within(rows[2]).queryAllByRole("button")).toHaveLength(0);
    // Row 1 is being typed: every tile of it is a target, filled or not.
    expect(within(rows[1]).getAllByRole("button")).toHaveLength(5);
  });

  it("renders no tap targets at all when the grid is given no handler", () => {
    render(
      <PhraseGrid
        guesses={[]}
        currentWords={["αβγ", ""]}
        currentWordIndex={0}
        wordLengths={WORD_LENGTHS}
      />,
    );
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("rings the focused word, and only that word", () => {
    render(
      <PhraseGrid
        guesses={[]}
        currentWords={["αβγ", "δε"]}
        currentWordIndex={1}
        wordLengths={WORD_LENGTHS}
        onFocusWord={vi.fn()}
      />,
    );

    const active = screen.getAllByRole("row")[0];
    // The cursor is the word's own border, darkened — see Tile.tsx for why it is
    // not a ring and not the accent.
    expect(within(active).getByLabelText("Δ pending").className).toContain("border-foreground");
    expect(within(active).getByLabelText("Α pending").className).not.toContain("border-foreground");
    expect(within(active).getByLabelText("Α pending").className).toContain("border-muted");
  });

  it("keeps every typed word on screen after the cursor jumps backwards", () => {
    // The regression this pairs with: the grid used to draw a typed letter as
    // `empty` whenever its word sat past the cursor — invisible while the cursor
    // only ever advanced, and a vanishing act the moment it could go back.
    render(
      <PhraseGrid
        guesses={[]}
        currentWords={["αβγ", "δε"]}
        currentWordIndex={0}
        wordLengths={WORD_LENGTHS}
        onFocusWord={vi.fn()}
      />,
    );

    const active = screen.getAllByRole("row")[0];
    expect(within(active).getByLabelText("Δ pending")).toBeInTheDocument();
    expect(within(active).getByLabelText("Ε pending")).toBeInTheDocument();
  });

  it("marks exactly one row as the active row, for the Board to scroll to", () => {
    const { container } = render(
      <PhraseGrid
        guesses={[playedGuess(["αβγ", "δε"], "absent"), playedGuess(["ζηθ", "ικ"], "absent")]}
        currentWords={["", ""]}
        currentWordIndex={0}
        wordLengths={WORD_LENGTHS}
      />,
    );

    const active = container.querySelectorAll("[data-active-row]");
    expect(active).toHaveLength(1);
    expect(screen.getAllByRole("row").indexOf(active[0] as HTMLElement)).toBe(2);
  });

  it("marks no active row once all six guesses are spent", () => {
    const { container } = render(
      <PhraseGrid
        guesses={Array.from({ length: 6 }, () => playedGuess(["αβγ", "δε"], "absent"))}
        currentWords={["", ""]}
        currentWordIndex={0}
        wordLengths={WORD_LENGTHS}
        onFocusWord={vi.fn()}
      />,
    );

    expect(container.querySelectorAll("[data-active-row]")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
