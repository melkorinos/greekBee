import { expect, test } from "./fixtures";

// ── Λεξοδρομία: one word solved in a real browser (TICKET-19) ────────────────
//
// The reducer, the decay scoring and the scramble are all covered in jsdom. What
// nothing covered until this spec is that the page MOUNTS in a browser and that a
// tile click reaches the reducer. This is the Platform's only timed Game, so it is
// also the one whose real-browser behaviour is least like its jsdom behaviour: the
// decay bar is driven by a 250 ms interval and a `visibilitychange` listener, and
// a listener wired to nothing would ship green.
//
// ── The pinned fixture ───────────────────────────────────────────────────────
// 2026-05-22 → word 1 is «φεσι» on the rack «φιεσ», word 2 «φανω» on «ανωφ».
// Chosen by driving the real `getTodaysLeksodromiaPuzzle` over forty dates and
// keeping one whose first word has four DISTINCT letters and exactly ONE accepted
// answer: distinct letters make every rack tile uniquely addressable by its label,
// and a single accepted answer means no wrong-order click can pass by landing on
// an anagram.
//
// Word 2 is four letters as well, not five — the ten words are 2 × each length
// 4–8 ascending, so the length only steps every second word.
const PUZZLE_DATE  = "2026-05-22";
const FIRST_WORD   = "φεσι";
const FIRST_RACK   = ["φ", "ι", "ε", "σ"];
const SECOND_RACK  = ["α", "ν", "ω", "φ"];

// ── Why this Game may not simply be played ───────────────────────────────────
// Memory's rule is "never finish a round in a test", on the grounds that Round End
// posts to the shared production `game_scores`. For Leksodromia that rule is not
// strict enough, and TICKET-19's "stop after one word" instruction inherits the
// gap: `useLiveScorePost` posts on EVERY live score increase, not at Round End, so
// solving a single word writes a row on its own.
//
// So the POST is intercepted in the browser and never reaches the server. The
// counter is not decoration — it is asserted below, because an interception that
// silently stopped matching would leave this spec writing to production every run
// while still passing.
test.describe("Leksodromia flow", () => {
  test("page mounts → one word is unscrambled → the board advances", async ({
    leksodromia,
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

    await leksodromia.goto(PUZZLE_DATE);
    await expect(leksodromia.heading).toBeVisible();
    await expect(leksodromia.decayBar).toBeVisible();

    // The rack renders the pinned scramble, and the answer row starts empty.
    await expect(leksodromia.rackTiles).toHaveText(FIRST_RACK);
    await expect(leksodromia.answerRow).toHaveText("");
    await expect(leksodromia.wordCounter(1, 10)).toBeVisible();
    await expect(leksodromia.totalScore(0)).toBeVisible();

    // ── Clicks reach the reducer ─────────────────────────────────────────────
    // Stop one letter short: filling the last slot auto-submits, so this is the
    // only point at which a partially built answer can be observed at all.
    await leksodromia.spell(FIRST_WORD.slice(0, -1));
    await expect(
      leksodromia.answerRow,
      "each rack click must land its letter in the answer row",
    ).toHaveText(FIRST_WORD.slice(0, -1));

    // ── The completing click submits the word ────────────────────────────────
    await leksodromia.spell(FIRST_WORD.slice(-1));

    // State, never elapsed time: word 2 of 10 is now on the board, wearing the
    // second word's rack. Asserting the letters rather than the count is what
    // makes this a *different word* rather than a re-render of the same one.
    await expect(leksodromia.wordCounter(2, 10)).toBeVisible();
    await expect(leksodromia.rackTiles).toHaveText(SECOND_RACK);
    await expect(leksodromia.answerRow).toHaveText("");

    // The exact total is a function of how long the click took, so it is never
    // asserted — only that it left zero. `MIN_SOLVED_POINTS` guarantees a solve
    // scores at least 5 however slow the run, so this cannot go flaky.
    await expect(
      leksodromia.totalScore(0),
      "a solved word always scores, so the running total must have left zero",
    ).toHaveCount(0);

    // ── The interception is load-bearing, so prove it fired ──────────────────
    // Fire-and-forget: `postScore` never awaits, so poll rather than read once.
    await expect
      .poll(() => scorePosts, {
        message: "solving one word must post a score — if it stopped, this spec no "
          + "longer proves anything about keeping production writes out",
      })
      .toBeGreaterThan(0);
  });
});
