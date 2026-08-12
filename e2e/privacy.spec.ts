import { expect, test } from "./fixtures";

// ── /privacy (TICKET-07) ─────────────────────────────────────────────────────
// The unit tests prove the page's *claims*. Only a real browser proves the thing
// that actually matters for a legal surface: that a player can get to it. The
// drawer link is the sole entry point — no footer, no header slot, no home-page
// link — so the walk from a game page to the page itself is the contract, and a
// route that renders but cannot be reached is the failure this guards against.

test.describe("privacy page", () => {
  test("is reachable by direct URL and renders", async ({ page }) => {
    const response = await page.goto("/privacy");

    expect(response?.status(), "/privacy must not redirect or 404").toBe(200);
    await expect(page.getByRole("heading", { name: "Απόρρητο", level: 1 })).toBeVisible();
  });

  test("a player can walk to it from the drawer on any page", async ({ page }) => {
    await page.goto("/leksokipos");

    await page.getByRole("button", { name: /open menu/i }).click();
    await page
      .getByRole("navigation", { name: /game navigation/i })
      .getByRole("link", { name: /Απόρρητο/i })
      .click();

    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole("heading", { name: "Απόρρητο", level: 1 })).toBeVisible();
  });

  test("nothing about privacy is pushed at a player who does not ask", async ({ page }) => {
    await page.goto("/");

    // No consent banner, no cookie dialog, no home-page link. The minimal posture
    // is deliberate and only defensible while there is no analytics and no ad
    // cookie — see TICKET-08's decision. If a banner ever appears here, that
    // premise changed and the page needs re-reading, not this test loosening.
    await expect(page.locator('a[href="/privacy"]')).toHaveCount(0);
  });
});
