// phraseLayout.test.ts — the word-wrap rule for the Vres Tin Frasi phrase grid.
//
// The grid used to force every phrase onto 1 or 2 lines and shrink the tiles to
// fit the 384px column. For long phrases that bottomed out at 16px tiles —
// 96 of the 411 shipped phrases rendered at 24px or smaller, which is not
// readable. The fix inverts the trade: the tile size is fixed and the phrase
// wraps onto as many lines as it needs, because vertical space is free (the
// keyboard is sticky, so the grid scrolls underneath it).
//
// The contract these tests protect: NO line ever exceeds the column width at
// the fixed tile size — for any phrase the corpus or a community submission can
// produce. A regression here is silently ugly, not loud, so it needs the corpus
// driven through the real packer rather than a handful of examples.

import { describe, expect, it } from "vitest";

import { AVAILABLE, lineWidth, packLines } from "@/components/vrestifrasi/phraseLayout";
import { VRESTIFRASI } from "@/config/gameRules";
import phrases from "@/data/vrestifrasi/phrases-el.json";

const corpusWordLengths = (phrases as Array<{ phrase: string }>).map((p) =>
  p.phrase.split(/\s+/).filter(Boolean).map((w) => w.length),
);

describe("packLines — line ranges", () => {
  it("returns no lines for a phrase with no words", () => {
    expect(packLines([])).toEqual([]);
  });

  it("keeps a phrase that fits on one line on one line", () => {
    // 5 + 3 = 8 tiles, 1 spacer → 8*32 + 8 + 8*4 = 296px ≤ 368
    expect(packLines([5, 3])).toEqual([{ from: 0, to: 2 }]);
  });

  it("starts a new line when the next word would overflow", () => {
    // [5,3] fits at 296px; adding a 7-letter word would be 560px
    expect(packLines([5, 3, 7])).toEqual([
      { from: 0, to: 2 },
      { from: 2, to: 3 },
    ]);
  });

  it("covers every word exactly once, in order", () => {
    for (const wordLengths of corpusWordLengths) {
      const lines = packLines(wordLengths);
      expect(lines[0].from).toBe(0);
      expect(lines[lines.length - 1].to).toBe(wordLengths.length);
      for (let i = 1; i < lines.length; i++) {
        expect(lines[i].from).toBe(lines[i - 1].to);
      }
    }
  });

  it("never emits an empty line", () => {
    for (const wordLengths of corpusWordLengths) {
      for (const { from, to } of packLines(wordLengths)) {
        expect(to).toBeGreaterThan(from);
      }
    }
  });
});

describe("packLines — the width contract", () => {
  it("fits every shipped phrase inside the column at the fixed tile size", () => {
    const offenders: string[] = [];

    for (const wordLengths of corpusWordLengths) {
      for (const { from, to } of packLines(wordLengths)) {
        const width = lineWidth(wordLengths.slice(from, to));
        if (width > AVAILABLE) offenders.push(`[${wordLengths.join(",")}] → ${width}px`);
      }
    }

    expect(offenders, `Lines wider than the ${AVAILABLE}px column:\n${offenders.join("\n")}`)
      .toEqual([]);
  });

  it("fits the worst phrase the validation rules allow", () => {
    // A community submission is capped at MAX_PHRASE_WORDS words of
    // MAX_WORD_LENGTH letters. That is the widest thing the game can be asked
    // to draw, and it must still wrap rather than overflow.
    const worst = Array<number>(VRESTIFRASI.MAX_PHRASE_WORDS).fill(
      VRESTIFRASI.MAX_WORD_LENGTH,
    );

    for (const { from, to } of packLines(worst)) {
      expect(lineWidth(worst.slice(from, to))).toBeLessThanOrEqual(AVAILABLE);
    }
  });

  it("gives a single over-long word its own line instead of looping forever", () => {
    // Not reachable through validateSubmission (MAX_WORD_LENGTH guards it), but
    // the packer must degrade to one overflowing line rather than hang.
    const lines = packLines([40, 3]);

    expect(lines).toEqual([
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ]);
  });
});

describe("lineWidth", () => {
  it("is zero for a line with no tiles", () => {
    expect(lineWidth([])).toBe(0);
  });

  it("counts tiles, inter-word spacers and the gap between every child", () => {
    // 3 tiles, no spacer → 3*32 + 2*4
    expect(lineWidth([3])).toBe(104);
    // 3 + 2 tiles, 1 spacer → 5*32 + 8 + 5*4
    expect(lineWidth([3, 2])).toBe(188);
  });
});
