// letterBoxBorder.test.ts
// Locks the one decision behind the letter-box outline: all five games that draw
// a letter box use the SAME token at the SAME weight.
//
// Why a guard rather than a comment: the boxes were strengthened because an
// unplayed grid was hard to read, and the token (--tile-border, globals.css) is
// deliberately a step stronger than --border so the platform's cards, inputs and
// separators keep their hairline. Nothing stops a future edit reaching for
// `border-border` out of habit in one game — it would compile, every test would
// stay green, and that game's grid would quietly go faint again while the other
// four stayed dark.
//
// This asserts the DECISION, not the result. No test here can tell a legible
// grid from an illegible one; that judgement is the operator's, on a screen.

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../../../");

/** Every component that draws a box a letter sits in. */
const LETTER_BOX_FILES = [
  "src/components/leksiarxeio/Tile.tsx",
  "src/components/vrestifrasi/Tile.tsx",
  "src/components/leksindeseis/WordCard.tsx",
  "src/components/leksoplegma/LeksoplegmaGrid.tsx",
  "src/components/leksodromia/LeksodromiaBoard.tsx",
];

/** The two that render a per-letter tile, where the 2px weight is the shared rule.
 * The other three carry `border-2` too, but on cards/slots sized by their own game. */
const TILE_FILES = [
  "src/components/leksiarxeio/Tile.tsx",
  "src/components/vrestifrasi/Tile.tsx",
];

const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

describe("letter-box outline is one token across every game that draws one", () => {
  it.each(LETTER_BOX_FILES)("%s uses the border-tile-border token", (rel) => {
    expect(read(rel)).toContain("border-tile-border");
  });

  it.each(TILE_FILES)("%s draws its tile at border-2", (rel) => {
    expect(read(rel)).toMatch(/\bborder-2\b/);
  });

  it("the token is defined for both themes in globals.css", () => {
    const css = read("src/app/globals.css");
    // Two definitions: the :root (light) value and the .dark override. A single
    // definition means one theme silently falls back to the inherited border.
    expect(css.match(/--tile-border:/g) ?? []).toHaveLength(2);
    // And exposed to Tailwind, or `border-tile-border` compiles to nothing at all.
    expect(css).toContain("--color-tile-border:");
  });
});
