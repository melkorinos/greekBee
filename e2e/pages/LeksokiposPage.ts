import type { Page } from "@playwright/test";

export class LeksokiposPage {
  readonly honeycomb;
  readonly foundWordsCount;

  constructor(private page: Page) {
    // FlowerGrid renders as an SVG — stable proxy for "game board mounted"
    this.honeycomb = page.locator("svg").first();
    this.foundWordsCount = page.getByTestId("found-words-count");
  }

  async goto() {
    await this.page.goto("/leksokipos");
    // /leksokipos always redirects to /leksokipos/<center>/<outer> (greeklish ASCII)
    await this.page.waitForURL(/\/leksokipos\/.+\/.+/);
  }

  async gotoCustom(center: string, outer: string) {
    await this.page.goto(`/leksokipos/${center}/${outer}`);
    await this.page.waitForURL(/\/leksokipos\/.+\/.+/);
    // Wait for the game board to mount (SVG renders after puzzle hydration)
    await this.honeycomb.waitFor();
  }

  // Playwright's keyboard.type() can't deliver Greek e.key values the window
  // listener needs, so we click the honeycomb cells — each is a role="button"
  // with aria-label "Letter <Χ>" that calls onClickLetter directly.
  async typeWord(word: string) {
    for (const ch of word) {
      await this.page
        .getByRole("button", { name: `Letter ${ch.toUpperCase()}`, exact: true })
        .click();
    }
  }

  async submitWord() {
    // The inline submit button appears once the word reaches the min length.
    await this.page.getByTestId("btn-enter").click();
  }
}
