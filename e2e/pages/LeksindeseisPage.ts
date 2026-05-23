import type { Page } from "@playwright/test";

export class LeksindeseisPage {
  readonly heading;

  constructor(private page: Page) {
    this.heading = page.getByRole("heading", { name: /Leksindeseis/i });
  }

  async goto() {
    await this.page.goto("/leksindeseis");
  }
}
