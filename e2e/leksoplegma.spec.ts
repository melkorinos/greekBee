import { expect, test } from "./fixtures";

// ── Λεξόπλεγμα: one word traced in a real browser (TICKET-20) ────────────────
//
// The last of ISSUE-03's Tier A happy paths, and deliberately the last: this is
// the only Game whose core input is a pointer drag across laid-out geometry. The
// unit tests hand `TRACE_WORD` a list of tile indices; the real thing runs a
// `pointermove` handler that hit-tests with `document.elementFromPoint` against
// boxes jsdom never lays out. If any Game's "works in tests, dead in the browser"
// gap is real, it is this one — so the drag is exercised for real here rather
// than routed around through the tap path the Board also supports.
//
// ── The pinned fixture ───────────────────────────────────────────────────────
// 2026-06-09 → puzzle leksoplegma-125, letters «αλεκκσαβενιααγελ», 9 required
// words. Chosen by driving the real `getPuzzleForDate` over sixty dates for a
// required word whose path is a STRAIGHT ORTHOGONAL RUN: «λεγα» is tiles
// 15 → 14 → 13 → 12, the bottom row right-to-left. Every other candidate turned
// a corner somewhere, and a diagonal step's straight line clips the two cells it
// passes between — traceable, but for no gain. A straight sweep makes the
// gesture the least flaky drag the grid can be asked for while still being the
// real gesture.
//
// «λεγα» also has no proper prefix among the required words or the extras, in
// either direction, so nothing can auto-submit mid-trace and steal the word.
const PUZZLE_DATE     = "2026-06-09";
const REQUIRED_TOTAL  = 9;
const WORD            = "λεγα";
const WORD_TILES      = [15, 14, 13, 12];

// ── Why the POST is intercepted ──────────────────────────────────────────────
// Memory's rule is "never finish a round in a test", and TICKET-20 read that as
// "stop after one word". That is not enough here, for the same reason it was not
// enough for Λεξοδρομία: `LeksoplegmaBoard` posts through `useLiveScorePost`,
// which fires on every score INCREASE, so tracing ONE word writes a row to the
// shared production `game_scores` on its own. Asserting before the post cannot
// help — the post rides the same state change the assertion waits for.
//
// So the POST is stubbed in the browser. The counter is not decoration: it is
// asserted below, because an interception that quietly stopped matching would
// write to production every run while this spec still passed.
test.describe("Leksoplegma flow", () => {
  test("page mounts → one word is dragged out of the web → it is found", async ({
    leksoplegma,
    page,
  }) => {
    let scorePosts = 0;
    await page.route("**/api/game-scores", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      scorePosts += 1;
      await route.fulfill({
        status:      200,
        contentType: "application/json",
        body:        JSON.stringify({ ok: true }),
      });
    });

    await leksoplegma.goto(PUZZLE_DATE);
    await expect(leksoplegma.heading).toBeVisible();

    // The web renders, nothing is found, and no trace is being built.
    await expect(leksoplegma.wordCounter(0, REQUIRED_TOTAL)).toBeVisible();
    await expect(leksoplegma.buildingWord).toHaveText("");
    await expect(leksoplegma.foundWords).toHaveCount(0);
    for (const index of WORD_TILES) {
      await expect(leksoplegma.tile(index)).toBeVisible();
    }

    // ── The drag reaches the reducer ─────────────────────────────────────────
    // Release submits, so the word is gone from the building slot by the time
    // this returns — what is asserted is the found list, not the trace.
    await leksoplegma.traceWord(WORD_TILES);

    await expect(
      leksoplegma.wordCounter(1, REQUIRED_TOTAL),
      "a dragged required word must be counted as found",
    ).toBeVisible();
    await expect(leksoplegma.foundWords).toContainText(WORD);
    await expect(leksoplegma.buildingWord).toHaveText("");

    // ── The interception is load-bearing, so prove it fired ──────────────────
    // Fire-and-forget: `postScore` never awaits, so poll rather than read once.
    await expect
      .poll(() => scorePosts, {
        message: "finding one word must post a score — if it stopped, this spec no "
          + "longer proves anything about keeping production writes out",
      })
      .toBeGreaterThan(0);
  });
});
