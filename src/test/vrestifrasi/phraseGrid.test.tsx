// phraseGrid.test.tsx — what the Vres Tin Frasi board must always show.
//
// s150 briefly dropped the unplayed rows to buy back vertical space after the
// tiles were enlarged. That was wrong: the six-row frame is how the player reads
// how many attempts are left, and a board that grows a row at a time shifts
// under the thumb on every submit. Both halves are locked here — the full frame
// on an untouched puzzle, and every played guess still on screen mid-round, so
// the clues from earlier tries stay readable while typing guess four.

import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

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
