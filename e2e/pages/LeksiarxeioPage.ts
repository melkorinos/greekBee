import type { Page } from "@playwright/test";

export class LeksiarxeioPage {
  readonly heading;
  readonly lengthDisplay;
  readonly firstGuessRow;

  constructor(private page: Page) {
    this.heading       = page.getByRole("heading", { name: /Leksiarxeio/i });
    // The "4"/"5"/… counter between the − and + length buttons
    this.lengthDisplay = page.locator("span.tabular-nums").first();
    this.firstGuessRow = page.getByTestId("guess-grid").locator('[data-row="0"]');
  }

  async goto() {
    await this.page.goto("/leksiarxeio");
  }

  async nextLength() {
    await this.page.getByRole("button", { name: "Μεγαλύτερο μήκος" }).click();
  }

  // Playwright's keyboard.type() can't deliver Greek e.key values the window
  // listener needs, so we click the on-screen keyboard keys — each is a button
  // with aria-label "Letter <Χ>" wired straight to addLetter.
  async typeWord(word: string) {
    for (const ch of word) {
      await this.page
        .getByRole("button", { name: `Letter ${ch.toUpperCase()}`, exact: true })
        .click();
    }
  }

  async submitGuess() {
    await this.page.getByTestId("btn-enter").click();
  }
}
