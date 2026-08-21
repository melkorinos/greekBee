import type { Locator, Page } from "@playwright/test";

/**
 * Λεξόπλεγμα board — the 4×4 word-web.
 *
 * This is the one Game whose core input is a **pointer drag across laid-out
 * geometry**, which is exactly what jsdom cannot simulate honestly: the unit
 * tests hand the reducer a list of tile indices, while the real thing depends on
 * `document.elementFromPoint` hitting the tile under the finger. So `traceWord`
 * below drives `page.mouse` over the tiles' real bounding boxes rather than
 * clicking them — the drag *is* the thing under test.
 *
 * Two details of `LeksoplegmaGrid` shape it:
 *
 * 1. **The press tile only joins the trace on the first move.** `onPointerDown`
 *    records the tile but adds nothing; the first `pointermove` over a *different*
 *    tile promotes the gesture to a drag and pushes both. So a drag must always
 *    cross at least two tiles, and a single jump can miss the ones between —
 *    hence stepped moves.
 * 2. **Release submits, from anywhere.** The `pointerup` listener is on `window`,
 *    so the mouse may lift over any tile; `onDragRelease` submits whatever the
 *    trace spells. There is no separate confirm for a dragged word (the ✓ button
 *    exists only so tap-builders can submit extra words, which never auto-submit).
 */
export class LeksoplegmaPage {
  readonly heading;
  readonly buildingWord;
  readonly foundWords;
  readonly grid;

  constructor(private page: Page) {
    this.heading      = page.getByRole("heading", { name: /Leksoplegma/i, level: 1 });
    this.buildingWord = page.getByTestId("building-word");
    this.foundWords   = page.getByTestId("found-words");
    this.grid         = page.locator("[data-tile]");
  }

  /**
   * Loads the board on a PINNED date rather than today's. The daily puzzle is a
   * rotation over the committed generator batch, so a pinned past date fixes the
   * grid, its letters and every required word's tile path — which is what lets
   * the spec hardcode one word's coordinates (memory: "e2e determinism").
   */
  async goto(puzzleDate: string) {
    await this.page.goto(`/leksoplegma?puzzle=${puzzleDate}`);
  }

  /** The «Λέξεις n/total» required-word counter — exact, so the row that wraps
   *  it (which also holds the extras and the total) cannot match too. */
  wordCounter(found: number, total: number): Locator {
    return this.page.getByText(`Λέξεις ${found}/${total}`, { exact: true });
  }

  /** One tile button, addressed by its grid index — never by its letter, since
   *  a 16-tile grid repeats letters freely. */
  tile(index: number): Locator {
    return this.page.locator(`[data-tile="${index}"]`);
  }

  /**
   * Drags across `tiles` in order and lifts, submitting whatever they spell.
   *
   * Every move is stepped: `elementFromPoint` is sampled per `pointermove`, so a
   * single jump between two centres can skip the tiles in between and produce a
   * trace the web rejects. Stepping also makes the first move land inside the
   * press tile's own box before leaving it, which is what promotes the gesture
   * from a tap to a drag.
   *
   * Tiles the pointer crosses without an edge to the trace's end are ignored by
   * `extended()`, so an imprecise path fails closed — it cannot silently trace a
   * different word.
   */
  async traceWord(tiles: readonly number[]) {
    const centres = await Promise.all(
      tiles.map(async (index) => {
        const box = await this.tile(index).boundingBox();
        if (!box) throw new Error(`tile ${index} has no bounding box — is it in the web?`);
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      }),
    );

    await this.page.mouse.move(centres[0].x, centres[0].y);
    await this.page.mouse.down();
    for (const { x, y } of centres.slice(1)) {
      await this.page.mouse.move(x, y, { steps: 12 });
    }
    await this.page.mouse.up();
  }
}
