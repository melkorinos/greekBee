import { expect, test as base } from "@playwright/test";

import { ConnectionsPage } from "./pages/ConnectionsPage";
import { SpellingBeePage } from "./pages/SpellingBeePage";
import { WordlePage } from "./pages/WordlePage";

type Fixtures = {
  spellingBee: SpellingBeePage;
  wordle: WordlePage;
  connections: ConnectionsPage;
};

export const test = base.extend<Fixtures>({
  spellingBee: async ({ page }, use) => use(new SpellingBeePage(page)),
  wordle:      async ({ page }, use) => use(new WordlePage(page)),
  connections: async ({ page }, use) => use(new ConnectionsPage(page)),
});

export { expect };
