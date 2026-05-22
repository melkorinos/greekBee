import type { Page } from "@playwright/test";

export class ConnectionsPage {
  readonly heading;

  constructor(private page: Page) {
    this.heading = page.getByRole("heading", { name: /Connections/i });
  }

  async goto() {
    await this.page.goto("/connections");
  }
}
