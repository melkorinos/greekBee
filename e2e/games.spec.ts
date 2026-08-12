import { expect, test } from "./fixtures";

test.describe("all games load", () => {
  test("Leksokipos — redirects and renders grid", async ({ leksokipos }) => {
    await leksokipos.goto();
    await expect(leksokipos.honeycomb).toBeVisible();
  });

  test("Leksiarxeio — renders page heading", async ({ leksiarxeio }) => {
    await leksiarxeio.goto();
    await expect(leksiarxeio.heading).toBeVisible();
  });

  test("Leksindeseis — renders page heading", async ({ leksindeseis }) => {
    await leksindeseis.goto();
    await expect(leksindeseis.heading).toBeVisible();
  });
});

// ── Hidden Games (TICKET-06 / ADR 0022) ──────────────────────────────────────
// `hidden` means unlisted, NOT disabled. The unit tests prove the picker and the
// drawer filter; only a real browser proves the other half — that the routes the
// operator plays by direct URL still render. The Leksindeseis test above is the
// third case and already covers it.

test.describe("hidden games stay reachable by direct URL", () => {
  for (const [name, path] of [
    ["Πόσο κάνει;",  "/posokanei"],
    ["Λογοπαίγνιο",  "/logopaignio"],
  ] as const) {
    test(`${name} — loads and renders its heading`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status(), `${path} must not redirect or 404`).toBe(200);
      await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
    });
  }
});

test.describe("the picker lists only launched games", () => {
  test("shows no hidden game and no under-construction section", async ({ page }) => {
    await page.goto("/");

    // The section header and the per-card chip both carried this copy; both are
    // deleted, so its absence is the assertion for either resurfacing.
    await expect(page.getByText("Υπό κατασκευή")).toHaveCount(0);

    for (const href of ["/leksindeseis", "/posokanei", "/logopaignio"]) {
      await expect(
        page.locator(`a[href="${href}"]`),
        `${href} is hidden (ADR 0022) and must not appear on the picker`,
      ).toHaveCount(0);
    }

    // Positive control: the picker is not simply empty.
    await expect(page.locator('a[href="/leksokipos"]')).toHaveCount(1);
  });
});
