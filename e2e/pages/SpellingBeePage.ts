import type { Page } from "@playwright/test";

export class SpellingBeePage {
  readonly honeycomb;

  constructor(private page: Page) {
    // HoneycombGrid renders as an SVG — stable proxy for "game board mounted"
    this.honeycomb = page.locator("svg").first();
  }

  async goto() {
    await this.page.goto("/spelling-bee");
    // /spelling-bee always redirects to /spelling-bee/<center>/<outer> (greeklish ASCII)
    await this.page.waitForURL(/\/spelling-bee\/.+\/.+/);
  }
}
