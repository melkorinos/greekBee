import { expect, test as base } from "@playwright/test";

import { LeksiarxeioPage } from "./pages/LeksiarxeioPage";
import { LeksokiposPage } from "./pages/LeksokiposPage";
import { LeksindeseisPage } from "./pages/LeksindeseisPage";

type Fixtures = {
  leksokipos:   LeksokiposPage;
  leksiarxeio:  LeksiarxeioPage;
  leksindeseis: LeksindeseisPage;
};

export const test = base.extend<Fixtures>({
  leksokipos:   async ({ page }, use) => use(new LeksokiposPage(page)),
  leksiarxeio:  async ({ page }, use) => use(new LeksiarxeioPage(page)),
  leksindeseis: async ({ page }, use) => use(new LeksindeseisPage(page)),
});

export { expect };
