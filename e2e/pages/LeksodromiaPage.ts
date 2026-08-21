import type { Locator, Page } from "@playwright/test";

/**
 * Λεξοδρομία board — the anagram sprint.
 *
 * Two things about this Game shape every locator here, and neither is true of
 * the other page objects:
 *
 * 1. **There is no submit button.** `TICKET-19` asked for `data-testid="btn-enter"`;
 *    Leksodromia has none, and neither does anything else in the component — the
 *    only rendered actions are 🧹 Καθαρισμός and ⏭️ Επόμενο. A word is submitted
 *    by *filling the last slot*: `LeksodromiaBoard.pickTile` predicts the
 *    completing click and queues SUBMIT_WORD behind the pick. So `spell()` is the
 *    whole input path, and the auto-submit is the behaviour under test rather
 *    than an implementation detail we route around.
 * 2. **Nothing may be asserted against the clock.** Points decay with elapsed
 *    time, so the readouts that move are the *word counter* and the *fact* that
 *    the total is no longer zero — a solve always scores at least
 *    `LEKSODROMIA.MIN_SOLVED_POINTS`, however slow the run. There is deliberately
 *    no helper here that reads the live points number or the decay bar's width.
 */
export class LeksodromiaPage {
  readonly heading;
  readonly answerRow;
  readonly decayBar;
  /** Every rack tile, used and unused — one per letter of the current word. */
  readonly rackTiles;

  constructor(private page: Page) {
    this.heading   = page.getByRole("heading", { name: /Leksodromia/i, level: 1 });
    this.answerRow = page.getByTestId("answer-row");
    this.decayBar  = page.getByRole("progressbar", { name: "Πόντοι λέξης που απομένουν" });
    this.rackTiles = page.locator('button[aria-label^="Γράμμα "]');
  }

  /**
   * Loads the board on a PINNED date rather than today's. Selection and scramble
   * are pure functions of the date over static answer pools, so pinning fixes
   * the ten words, their racks and their answers — a spec that played today's
   * content would break the morning the rotation moved (memory: "e2e
   * determinism").
   */
  async goto(puzzleDate: string) {
    await this.page.goto(`/leksodromia?puzzle=${puzzleDate}`);
  }

  /** The «Λέξη n/total» progress readout — matched exactly so the flex row that
   *  wraps it (which also holds the points and the total) cannot match too. */
  wordCounter(step: number, total: number): Locator {
    return this.page.getByText(`Λέξη ${step}/${total}`, { exact: true });
  }

  /** The «Σύνολο n» readout. Only ever used with 0 — see the class comment. */
  totalScore(points: number): Locator {
    return this.page.getByText(`Σύνολο ${points}`, { exact: true });
  }

  /**
   * The first still-unused rack tile bearing `letter`. The filter matters: a word
   * with a repeated letter renders two tiles with identical labels, and a used
   * tile stays in the DOM `disabled` (it is hidden with `opacity-0`, which
   * Playwright still counts as visible).
   *
   * Labels carry the raw lowercase letter — the uppercase is CSS only.
   */
  tile(letter: string): Locator {
    return this.page
      .locator(`button[aria-label="Γράμμα ${letter.toLowerCase()}"]:not([disabled])`)
      .first();
  }

  /**
   * Clicks the rack tiles spelling `word`, in order.
   *
   * Tiles are clicked rather than typed for the reason the other page objects
   * document: Playwright cannot deliver a Greek `keydown` at all — `keyboard.type`
   * on Greek text fires no events, while Latin in the same call arrives normally
   * (memory: "e2e cold-chunk flake"). On this board the physical-keyboard handler
   * is the only other input path, so clicking is the only one that works.
   *
   * Filling the final slot submits the word; there is no separate confirm step.
   */
  async spell(word: string) {
    for (const letter of word) {
      await this.tile(letter).click();
    }
  }
}
