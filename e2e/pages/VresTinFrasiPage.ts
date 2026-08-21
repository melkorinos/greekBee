import type { Page } from "@playwright/test";

/**
 * Vres Tin Frasi board.
 *
 * The phrase grid has no `data-testid` and no per-row `data-*` hook the way
 * Leksiarxeio's does — it is an ARIA grid (`role="grid"` / `role="row"`), so the
 * rows are addressed by role rather than by test id. That is deliberate: the
 * roles are what a screen reader reads, so a locator built on them fails if the
 * grid stops being a grid, which a testid would not catch.
 */
export class VresTinFrasiPage {
  readonly heading;
  readonly grid;
  readonly firstGuessRow;
  readonly resultPanel;
  readonly leaderboardTrigger;

  constructor(private page: Page) {
    this.heading            = page.getByRole("heading", { name: /Vres Tin Frasi/i, level: 1 });
    this.grid               = page.getByRole("grid", { name: "Phrase guess grid" });
    this.firstGuessRow      = this.grid.getByRole("row").first();
    this.resultPanel        = page.getByTestId("vrestifrasi-result");
    this.leaderboardTrigger = page.getByRole("button", { name: "Πίνακας σκορ" });
  }

  /**
   * Loads the board on a PINNED date rather than today's. Rotation is a pure
   * function of the date over committed JSON, so pinning fixes the phrase, the
   * valid input and the answer — a spec that played today's content would break
   * the morning the rotation moved (memory: "e2e determinism").
   */
  async goto(puzzleDate: string) {
    await this.page.goto(`/vres-tin-frasi?puzzle=${puzzleDate}`);
  }

  // Playwright's keyboard.type() can't deliver Greek e.key values the window
  // listener needs, so we click the on-screen keyboard keys — each is a button
  // with aria-label "Letter <Χ>" wired straight to addLetter. Same reason as the
  // other two page objects.
  //
  // A guess here is the WHOLE phrase, not one word: the reducer auto-advances the
  // cursor when a word reaches its required length, so the phrase is typed as one
  // unbroken run of letters with the spaces dropped.
  async typePhrase(phrase: string) {
    for (const ch of phrase.replace(/ /g, "")) {
      await this.page
        .getByRole("button", { name: `Letter ${ch.toUpperCase()}`, exact: true })
        .click();
    }
  }

  async submitGuess() {
    await this.page.getByTestId("btn-enter").click();
  }
}
