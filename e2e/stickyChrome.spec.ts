import { expect, test } from "./fixtures";

// ── The tall-phrase board: pinned chrome + word focus ────────────────────────
//
// Two fixes from 2026-08-29, both invisible to jsdom, which is the whole reason
// they live in a browser spec.
//
// 1. `html, body { overflow-x: hidden }` had made `body` a scroll container that
//    can never scroll, and `position: sticky` measures against its nearest
//    scrollport — so BOTH sticky elements on the Platform were inert. On a phone,
//    this game's keyboard sat at y=898 on a 664px screen. globals.css uses
//    `overflow-x: clip` now; `shared/stickyChromeSurvives.test.ts` guards the
//    declaration, and only this file can see whether anything actually sticks.
//
// 2. The phrase is typed as one unbroken run of letters, so a typo three words
//    back cost every letter typed since. Tapping a word now moves the cursor to
//    it.
//
// ── The pinned fixture ───────────────────────────────────────────────────────
// 2026-08-29 → «Έφτασε ο κόμπος στο χτένι», word lengths 6/1/6/3/5. Chosen as a
// phrase that WRAPS to three lines at the game's fixed 32px tiles: the six-row
// frame is then ~700px, taller than the phone viewport below, which is exactly
// the condition both fixes exist for. Rotation is a pure function of the date
// over committed JSON, so the phrase is fixed.
const TALL_DATE = "2026-08-29";

// Word 0 is 6 letters, word 1 is 1 letter. Every letter is on the keyboard.
const WORD_0 = "καλημε";
const WORD_1 = "ρ";

// A complete, VALID, wrong guess matching the fixture's 6/1/6/3/5 lengths — every
// word checked against the pools the page loads, so it is scored rather than
// bounced, and none of it is the answer. The reducer does not reject a repeat, so
// this one guess can be submitted as many times as a test needs rows.
const VALID_GUESS = "αβαθεσ ο αβακασ αγω αβαθα";

test.describe("tall phrase on a phone", () => {
  // A real small screen. The bug cannot appear at desktop height, where the whole
  // board fits and nothing needs to stick.
  test.use({ viewport: { width: 390, height: 664 } });

  test("the keyboard stays on screen even though the grid is taller than the viewport", async ({
    vrestifrasi,
    page,
  }) => {
    await vrestifrasi.goto(TALL_DATE);
    await expect(vrestifrasi.grid).toBeVisible();

    const viewportHeight = page.viewportSize()!.height;

    // Positive control: without a grid taller than the screen this test proves
    // nothing, because an unpinned keyboard would be on screen anyway.
    const gridHeight = (await vrestifrasi.grid.boundingBox())!.height;
    expect(
      gridHeight,
      "fixture must still be a phrase whose board overflows the viewport",
    ).toBeGreaterThan(viewportHeight);

    for (const scrollY of [0, 200, 400]) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollY);
      const box = (await vrestifrasi.keyboard.boundingBox())!;
      expect(
        box.y + box.height,
        `keyboard must be inside the viewport at scrollY=${scrollY}`,
      ).toBeLessThanOrEqual(viewportHeight + 1);
    }
  });

  test("the shared header stays pinned while the page scrolls", async ({
    vrestifrasi,
    page,
  }) => {
    await vrestifrasi.goto(TALL_DATE);
    await expect(vrestifrasi.grid).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 400));
    const header = (await page.locator("header").boundingBox())!;
    expect(header.y, "the Shell header is sticky top-0 on every page").toBeCloseTo(0, 0);
  });

  test("the row being typed is scrolled clear of the pinned keyboard", async ({
    vrestifrasi,
    page,
  }) => {
    await vrestifrasi.goto(TALL_DATE);
    await expect(vrestifrasi.grid).toBeVisible();

    // Three guesses deep is where this starts to matter: each row of this phrase
    // is three lines tall, so row 3 sits under the pinned keys at this viewport.
    // Pinning the keyboard is only half the fix — seeing the keys is no use if
    // they write somewhere off screen.
    for (let i = 0; i < 3; i++) {
      await vrestifrasi.typePhrase(VALID_GUESS);
      await vrestifrasi.submitGuess();
      await expect(vrestifrasi.grid.getByRole("row").nth(i)).toContainText("Β");
    }

    // Positive control: without the scroll, this row's natural spot is behind the
    // keys, so the assertion below is proving the scroll rather than a layout
    // that never needed one.
    const naturalTop = await vrestifrasi.activeRow.evaluate(
      (el) => el.getBoundingClientRect().top + window.scrollY,
    );
    const keys = (await vrestifrasi.keyboard.boundingBox())!;
    expect(naturalTop, "fixture must still put row 3 below the fold").toBeGreaterThan(keys.y);

    // The board scrolls smoothly, so poll rather than sample mid-animation.
    const header = (await page.locator("header").boundingBox())!;
    await expect
      .poll(async () => {
        const r = (await vrestifrasi.activeRow.boundingBox())!;
        return Math.round(r.y + r.height);
      }, { message: "the active row must settle above the pinned keyboard" })
      .toBeLessThanOrEqual(Math.round(keys.y) + 1);

    const row = (await vrestifrasi.activeRow.boundingBox())!;
    expect(row.y, "the active row must clear the pinned header").toBeGreaterThanOrEqual(
      header.y + header.height - 1,
    );
  });
});

test.describe("tapping a word to edit it", () => {
  test("delete after a tap eats the tapped word, not the last one typed", async ({
    vrestifrasi,
    page,
  }) => {
    await vrestifrasi.goto(TALL_DATE);
    await vrestifrasi.typePhrase(`${WORD_0} ${WORD_1}`);

    // Tap the FIRST letter of word 0 — the cursor must land on the word, not on
    // the letter, so word 0's last letter is what a delete then removes.
    await vrestifrasi.activeTiles.nth(0).click();
    await page.getByTestId("btn-delete").click();

    const letters = await vrestifrasi.activeRowLetters();
    expect(letters.slice(0, 6).join(""), "word 0 lost exactly its last letter").toBe("ΚΑΛΗΜ");
    expect(letters[6], "word 1 is untouched by an edit to word 0").toBe("Ρ");
  });

  test("a word typed past the cursor stays on screen after the cursor jumps back", async ({
    vrestifrasi,
  }) => {
    await vrestifrasi.goto(TALL_DATE);
    await vrestifrasi.typePhrase(`${WORD_0} ${WORD_1}`);
    await vrestifrasi.activeTiles.nth(0).click();

    // The grid used to draw a typed letter as `empty` when its word sat past the
    // cursor — invisible while the cursor only advanced, a vanishing act as soon
    // as it could go back.
    expect((await vrestifrasi.activeRowLetters())[6]).toBe("Ρ");
  });

  test("only the row being typed offers tap targets", async ({ vrestifrasi }) => {
    await vrestifrasi.goto(TALL_DATE);

    // 6 + 1 + 6 + 3 + 5 tiles, all in the one active row and nowhere else.
    await expect(vrestifrasi.activeRow).toHaveCount(1);
    await expect(vrestifrasi.activeTiles).toHaveCount(21);
    await expect(
      vrestifrasi.grid.getByRole("button"),
      "played and unreached rows are not editable, so they hold no buttons",
    ).toHaveCount(21);
  });
});
