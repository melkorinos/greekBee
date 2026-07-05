import { expect, test } from "./fixtures";

// ── Leksokipos: custom puzzle → word submission → reload → rehydration ────────

test.describe("Leksokipos flow", () => {
  // Fixture: center α (greeklish: a), outer λεοσρτ (greeklish: elorst).
  // Verified: 424 valid words in words-el.json, including αλασ (4 letters, 1 pt).
  // Custom puzzles are excluded from the Leaderboard; no DB noise from this test.
  const CENTER = "a";
  const OUTER  = "elorst";
  const WORD   = "αλασ";   // normalised Greek — no accents

  test("word submission → score update → reload → state rehydrates", async ({ leksokipos, page }) => {
    await leksokipos.gotoCustom(CENTER, OUTER);

    await leksokipos.typeWord(WORD);
    await leksokipos.submitWord();

    await expect(leksokipos.foundWordsCount).toHaveText("1");

    await page.reload();
    await leksokipos.honeycomb.waitFor();

    // useGameStore restores foundWords from localStorage on remount
    await expect(leksokipos.foundWordsCount).toHaveText("1");
  });
});

// ── Leksiarxeio: length-switcher → guess cycle ────────────────────────────────

test.describe("Leksiarxeio flow", () => {
  test("length-switcher changes active puzzle + guess is processed", async ({ leksiarxeio }) => {
    await leksiarxeio.goto();
    await expect(leksiarxeio.heading).toBeVisible();

    // Board defaults to length 4; switch to 5
    await leksiarxeio.nextLength();
    await expect(leksiarxeio.lengthDisplay).toHaveText("5");

    // αρετη is a valid 5-letter word (verified in words-5.json). It only needs to
    // pass validation so the guess is scored and tiles render — not be the answer.
    await leksiarxeio.typeWord("αρετη");
    await leksiarxeio.submitGuess();

    // The first row now holds scored tiles — each Tile's aria-label carries its
    // state ("<letter> correct|present|absent"), proving the guess pipeline fired.
    await expect(leksiarxeio.firstGuessRow).toBeVisible();
    await expect(
      leksiarxeio.firstGuessRow
        .locator('[aria-label*="absent"], [aria-label*="present"], [aria-label*="correct"]')
        .first()
    ).toBeVisible();
  });
});
