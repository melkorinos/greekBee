import { expect, test } from "./fixtures";

// ── Vres Tin Frasi: full round in a real browser (TICKET-17) ─────────────────
//
// The reducer, the scoring and the phrase layout are all covered in jsdom. What
// nothing covered until this spec is that the page MOUNTS in a browser and that a
// keypress reaches the reducer — a hydration error or a keyboard wired to nothing
// would ship green without it.
//
// Playing the round to its end is possible only since ADR 0027: the Game's
// `scores` capability is revoked, so finishing writes no row to the shared
// production `game_scores` (verified with a live count either side of this spec's
// first run). The general rule in memory — "never finish a round in a test" —
// still holds for every Game that DOES score.
//
// ── The pinned fixture ───────────────────────────────────────────────────────
// 2026-05-22 → «Εδώ και τώρα» → normalised εδω / και / τωρα (lengths 3, 3, 4).
// Chosen as the shortest phrase in the rotation, so a full round is 20 key clicks.
// Since TICKET-23 the static rotation is the only source, so no approved community
// phrase can shadow the date.
const PUZZLE_DATE = "2026-05-22";
const ANSWER      = "εδω και τωρα";

// A valid non-answer guess with the same word lengths. Verified against the same
// word pools the page loads (words-1 + leksiarxeio 2..8): every word is in the
// pool, so the guess is scored rather than rejected, and it produces ALL FOUR tile
// states — ε correct, ω/α present, the κ/α/λ/η run absent, and the cross-word
// purple (ADR 0004) that no other Game has.
const PROBE_GUESS = "ενα ωρα καλη";

test.describe("Vres Tin Frasi flow", () => {
  test("page mounts → guess is scored → round end shows the Result Panel", async ({
    vrestifrasi,
  }) => {
    await vrestifrasi.goto(PUZZLE_DATE);
    await expect(vrestifrasi.heading).toBeVisible();
    await expect(vrestifrasi.grid).toBeVisible();

    // ── The guess pipeline: keyboard → reducer → scored tiles ────────────────
    await vrestifrasi.typePhrase(PROBE_GUESS);
    await vrestifrasi.submitGuess();

    // Each Tile's aria-label carries its state ("<letter> correct|present|absent|
    // misplaced-word"), same as Leksiarxeio. All four appear in this guess.
    for (const state of ["correct", "present", "absent", "misplaced-word"]) {
      await expect(
        vrestifrasi.firstGuessRow.locator(`[aria-label$=" ${state}"]`).first(),
        `the probe guess must produce at least one "${state}" tile`,
      ).toBeVisible();
    }

    // ── Round End ────────────────────────────────────────────────────────────
    await vrestifrasi.typePhrase(ANSWER);
    await vrestifrasi.submitGuess();

    await expect(vrestifrasi.resultPanel).toBeVisible();
    // The verdict is the panel's leading line for this Game, since there is no
    // score heading above it (ADR 0027). The phrase itself is not printed here
    // any more (2026-08-21) — on a win the solved grid already spells it out.
    await expect(vrestifrasi.resultPanel).toContainText("Βρήκες τη φράση");
    await expect(vrestifrasi.resultPanel.getByTestId("btn-share-result")).toBeVisible();
  });

  // ── ADR 0027 regression guard, browser level ───────────────────────────────
  // A re-added button is visible here and invisible to jsdom, which is the whole
  // reason these two live in a browser spec.
  test("no leaderboard control and no score heading anywhere in the round", async ({
    vrestifrasi,
  }) => {
    await vrestifrasi.goto(PUZZLE_DATE);

    await expect(
      vrestifrasi.leaderboardTrigger,
      "the 🏆 header trigger is revoked with the leaderboard capability",
    ).toHaveCount(0);

    await vrestifrasi.typePhrase(ANSWER);
    await vrestifrasi.submitGuess();
    await expect(vrestifrasi.resultPanel).toBeVisible();

    await expect(
      vrestifrasi.resultPanel,
      "a scoreless Game must render no «πόντοι» heading — an empty 0 would be a lie",
    ).not.toContainText("πόντοι");
    await expect(
      vrestifrasi.resultPanel.getByText("Δες τον πίνακα σκορ"),
    ).toHaveCount(0);
  });

  test("the picker card offers neither community submission nor a leaderboard", async ({
    page,
  }) => {
    await page.goto("/");

    const card = page.locator('li:has(a[href="/vres-tin-frasi"])');
    await expect(card).toHaveCount(1);

    await expect(card.getByRole("button", { name: "Υποβολή Παζλ" })).toHaveCount(0);
    await expect(card.getByRole("button", { name: "Πίνακας Σκορ" })).toHaveCount(0);

    // Positive control: a Game that still scores is untouched by ADR 0027, so the
    // assertions above are proving a removal rather than a broken locator.
    await expect(
      page.locator('li:has(a[href="/leksodromia"])').getByRole("button", { name: "Πίνακας Σκορ" }),
    ).toHaveCount(1);
  });
});
