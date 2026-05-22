import type { Page } from "@playwright/test";

export class WordlePage {
  readonly heading;

  constructor(private page: Page) {
    this.heading = page.getByRole("heading", { name: /Wordle GR/i });
  }

  async goto() {
    await this.page.goto("/wordle");
  }
}
