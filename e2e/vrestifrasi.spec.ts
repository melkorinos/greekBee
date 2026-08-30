import { expect, test } from "./fixtures";

// ── Vres Tin Frasi: full round in a real browser (TICKET-17) ─────────────────
//
// The reducer, the scoring and the phrase layout are all covered in jsdom. What
// nothing covered until this spec is that the page MOUNTS in a browser and that a
// keypress reaches the reducer — a hydration error or a keyboard wired to nothing
// would ship green without it.
//
// Playing the round to its end used to be free: ADR 0027 had revoked the Game's
// `scores` capability, so finishing wrote no row. **ADR 0028 gave it back on
// 2026-08-30**, which puts this spec squarely under the general rule — never
// finish a round in a test against the shared production `game_scores`. So the
// POST is stubbed, and the stub is asserted to have fired: an interception that
// silently stops matching would write to production on every run while still
// passing green (the trap `e2e/leksodromia.spec.ts` documents).
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
    page,
    vrestifrasi,
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
    await expect(vrestifrasi.resultPanel).toContainText("πόντοι");
    // The verdict line sits under the score heading. The phrase itself is not
    // printed here (2026-08-21) — on a win the solved grid already spells it out.
    await expect(vrestifrasi.resultPanel).toContainText("Βρήκες τη φράση");
    await expect(vrestifrasi.resultPanel.getByTestId("btn-share-result")).toBeVisible();

    // The stub, not the network, took the round's score.
    expect(scorePosts, "the score POST must have been intercepted, not sent").toBeGreaterThan(0);
  });

  // ── ADR 0028 guard, browser level ──────────────────────────────────────────
  // A missing button is invisible to jsdom exactly as a re-added one was, which is
  // the whole reason this lives in a browser spec.
  test("the leaderboard is reachable from the header and from the Result Panel", async ({
    page,
    vrestifrasi,
  }) => {
    await page.route("**/api/game-scores", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status:      200,
        contentType: "application/json",
        body:        JSON.stringify({ ok: true }),
      });
    });

    await vrestifrasi.goto(PUZZLE_DATE);

    await expect(
      vrestifrasi.leaderboardTrigger,
      "the 🏆 header trigger comes back with the leaderboard capability",
    ).toHaveCount(1);

    await vrestifrasi.typePhrase(ANSWER);
    await vrestifrasi.submitGuess();
    await expect(vrestifrasi.resultPanel).toBeVisible();

    await expect(vrestifrasi.resultPanel).toContainText("πόντοι");
    await expect(
      vrestifrasi.resultPanel.getByText("Δες τον πίνακα σκορ"),
    ).toHaveCount(1);
  });

  test("the picker card offers the leaderboard but not community submission", async ({
    page,
  }) => {
    await page.goto("/");

    const card = page.locator('li:has(a[href="/vres-tin-frasi"])');
    await expect(card).toHaveCount(1);

    // Community submission stayed removed when ADR 0028 restored the leaderboard —
    // the two halves of ADR 0027 were reversed separately, and only one of them was.
    await expect(card.getByRole("button", { name: "Υποβολή Παζλ" })).toHaveCount(0);
    await expect(card.getByRole("button", { name: "Πίνακας Σκορ" })).toHaveCount(1);
    // That last assertion is also the positive control for the one above it: the
    // same `card` locator finds a button, so the missing submit button is a removal
    // and not a locator that quietly stopped matching. No second card is needed —
    // Λεξινδέσεις is the only other Game with a submit button and it is `hidden`,
    // so it never reaches the picker.
  });
});
