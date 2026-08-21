import { expect, test as base } from "@playwright/test";

import { LeksiarxeioPage } from "./pages/LeksiarxeioPage";
import { LeksodromiaPage } from "./pages/LeksodromiaPage";
import { LeksokiposPage } from "./pages/LeksokiposPage";
import { LeksindeseisPage } from "./pages/LeksindeseisPage";
import { VresTinFrasiPage } from "./pages/VresTinFrasiPage";

type Fixtures = {
  leksokipos:   LeksokiposPage;
  leksiarxeio:  LeksiarxeioPage;
  leksindeseis: LeksindeseisPage;
  leksodromia:  LeksodromiaPage;
  vrestifrasi:  VresTinFrasiPage;
};

export const test = base.extend<Fixtures>({
  leksokipos:   async ({ page }, use) => use(new LeksokiposPage(page)),
  leksiarxeio:  async ({ page }, use) => use(new LeksiarxeioPage(page)),
  leksindeseis: async ({ page }, use) => use(new LeksindeseisPage(page)),
  leksodromia:  async ({ page }, use) => use(new LeksodromiaPage(page)),
  vrestifrasi:  async ({ page }, use) => use(new VresTinFrasiPage(page)),
});

export { expect };
