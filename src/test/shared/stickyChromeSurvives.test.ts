// stickyChromeSurvives.test.ts
// Locks the one CSS declaration that decides whether `position: sticky` works
// anywhere on the Platform.
//
// The bug this replaces (found 2026-08-29, on a Vres Tin Frasi phrase too tall to
// fit a phone): `html, body { overflow-x: hidden }` had been in globals.css since
// long before either sticky element existed. `overflow-x: hidden` with a visible
// y axis computes the y axis to `auto` — so `body` became a SCROLL CONTAINER, and
// one that can never scroll, because its height always equals its content's.
// `position: sticky` measures against its nearest scrollport, found that dead one
// instead of the viewport, and never engaged. Both sticky elements on the
// Platform were silently inert: the Shell header scrolled away with the page, and
// the Vres Tin Frasi keyboard sat 900px down a 664px screen.
//
// `overflow-x: clip` clips exactly the same overflow and creates no scroll
// container, so it keeps the horizontal-drag fix the rule was written for.
//
// A unit test cannot see a pinned header — only a browser can, and
// `e2e/stickyChrome.spec.ts` does. What this file guards is the pairing: the
// declaration and the sticky call sites that depend on it must not drift apart,
// since reverting `clip` to `hidden` breaks both games' chrome while every other
// test stays green.

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../../../");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

/** Every element that relies on the viewport being the nearest scrollport. */
const STICKY_CALL_SITES = [
  { file: "src/components/shared/Shell.tsx",                    cls: "sticky top-0" },
  { file: "src/components/vrestifrasi/VresTinFrasiBoard.tsx",   cls: "sticky bottom-0" },
];

describe("the root overflow rule cannot re-break position: sticky", () => {
  const css = read("src/app/globals.css");

  it("clips horizontal overflow with `clip`, never `hidden`", () => {
    const rule = css.match(/html,\s*body\s*\{[^}]*\}/);
    expect(rule, "the html, body overflow rule must still exist").not.toBeNull();
    expect(rule![0]).toContain("overflow-x: clip");
    expect(
      rule![0],
      "`overflow-x: hidden` makes body a scrollport that never scrolls, which " +
        "silently disables every sticky element on the Platform",
    ).not.toContain("hidden");
  });

  it("sets no overflow on html or body that would restore a scroll container", () => {
    // `overflow`, `overflow-y`, `overflow-block` — any of them with a value other
    // than `visible`/`clip` re-creates the scrollport the x axis no longer does.
    const rule = css.match(/html,\s*body\s*\{[^}]*\}/)![0];
    expect(rule).not.toMatch(/overflow(-y|-block)?\s*:\s*(hidden|auto|scroll)/);
  });

  it("still has the sticky call sites the rule exists to protect", () => {
    for (const { file, cls } of STICKY_CALL_SITES) {
      expect(read(file), `${file} should still use \`${cls}\``).toContain(cls);
    }
  });
});
