import type { Page } from "@playwright/test";

export class WordlePage {
  readonly heading;

  constructor(private page: Page) {
    this.heading = page.getByRole("heading", { name: /Leksiarxeio/i });
  }

  async goto() {
    await this.page.goto("/leksiarxeio");
  }
}
