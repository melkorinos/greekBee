// keyOutOfPlay.test.tsx
// Locks the decision behind an eliminated keyboard key: "out of play" is said
// with a SHAPE, and both Wordle-shaped games say it the same way.
//
// Why a guard rather than a comment. This started as a colour change — dark mode
// was painting an eliminated key lighter than a key still in play, and the fix
// was a second pair of grey tokens. The greys were reverted: asking a player to
// rank two greys mid-game is the wrong instrument, and it fails outright for a
// colour-blind one. `keyStruck` (src/styles/recipes.ts) draws a strike across the
// key face instead. Nothing stops a future edit dropping the recipe from one of
// the two keyboards — it would compile, every other test would stay green, and
// that game would silently go back to grey-on-grey.
//
// The second decision guarded here is quieter and easier to break by accident:
// Enter and Delete report NOTHING, so they carry the untouched-letter fill, and
// they must keep carrying exactly it. A key that reports nothing must not look
// like a key that reports something.
//
// This asserts the DECISIONS, not the result. No test here can tell a readable
// keyboard from an unreadable one; that judgement is the operator's, on a screen.

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { Keyboard as LeksiarxeioKeyboard } from "@/components/leksiarxeio/Keyboard";
import { Keyboard as VresTinFrasiKeyboard } from "@/components/vrestifrasi/Keyboard";
import { keyStruck } from "@/styles/recipes";

const noop = () => {};

// Mounted through a thunk per game rather than one parametrised component: the
// two keyboards take the same props but different letter-state unions, and a
// shared prop type would only be a cast pretending otherwise.
// α is eliminated in both fixtures; β is untouched.
const KEYBOARDS = [
  [
    "Leksiarxeio",
    () =>
      render(
        <LeksiarxeioKeyboard
          letterStates={{ α: "absent" }}
          onLetter={noop}
          onDelete={noop}
          onEnter={noop}
        />
      ),
  ],
  [
    "Vres Tin Frasi",
    () =>
      render(
        <VresTinFrasiKeyboard
          letterStates={{ α: "absent" }}
          onLetter={noop}
          onDelete={noop}
          onEnter={noop}
        />
      ),
  ],
] as const;

/** The colour-bearing utilities on a key, sorted. Deliberately narrow: `border`
 * (weight), `text-base` (size) and the layout classes must not count, or the
 * comparison below would only be asserting that two buttons share a layout. */
const COLOUR_UTILITY =
  /^(?:bg|border)-[a-z-]+$|^text-(?:foreground|muted|white|correct|present|absent|misplaced)$/;

function colourUtilities(el: HTMLElement): string[] {
  return el.className.split(/\s+/).filter((c) => COLOUR_UTILITY.test(c)).sort();
}

describe("an eliminated key is struck through, in every game that draws a keyboard", () => {
  it.each(KEYBOARDS)("%s marks the absent key with the shared strike", (_name, mount) => {
    const { getByTestId } = mount();
    expect(getByTestId("key-α").className).toContain(keyStruck);
  });

  it.each(KEYBOARDS)("%s leaves keys still in play unstruck", (_name, mount) => {
    const { getByTestId } = mount();
    expect(getByTestId("key-β").className).not.toContain("after:content");
  });

  it.each(KEYBOARDS)("%s never strikes Enter or Delete", (_name, mount) => {
    const { getByTestId } = mount();
    expect(getByTestId("btn-enter").className).not.toContain("after:content");
    expect(getByTestId("btn-delete").className).not.toContain("after:content");
  });

  // A pseudo-element with no `content` never renders. Every className assertion
  // above would still pass while the keyboard showed nothing at all.
  it("the recipe declares content, a position, and the diagonal itself", () => {
    expect(keyStruck).toContain("after:content-['']");
    expect(keyStruck).toContain("after:absolute");
    expect(keyStruck).toContain("relative");
    expect(keyStruck).toContain("linear-gradient(to_top_right");
    // currentColor, so the strike needs no token and no `dark:` pair.
    expect(keyStruck).toContain("currentColor");
  });
});

describe("Enter and Delete wear the untouched-letter fill", () => {
  it.each(KEYBOARDS)("%s: both action keys match an unplayed letter key", (_name, mount) => {
    const { getByTestId } = mount();
    // β is untouched in the fixture above, so it carries the `unknown` fill.
    const unplayed = colourUtilities(getByTestId("key-β"));

    expect(unplayed.length).toBeGreaterThan(0);
    expect(colourUtilities(getByTestId("btn-enter"))).toEqual(unplayed);
    expect(colourUtilities(getByTestId("btn-delete"))).toEqual(unplayed);
  });

  it.each(KEYBOARDS)("%s: that fill is not a feedback colour", (_name, mount) => {
    const { getByTestId } = mount();
    for (const fill of colourUtilities(getByTestId("btn-enter"))) {
      expect(fill).not.toMatch(/-(correct|present|absent|misplaced)$/);
    }
  });
});
