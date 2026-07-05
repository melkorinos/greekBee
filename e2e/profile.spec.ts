import { expect, test } from "./fixtures";

// Regression guard for the "duplicate top row" bug: the root layout wraps every
// page in <Shell> (one sticky <header>), so no page may render its own Shell on
// top. The profile page used to double-wrap, producing two identical headers —
// invisible to jsdom unit tests that render <ProfilePage> in isolation, which is
// why this lives at the e2e seam where layout → page compose for real.

test.describe("Profile page — layout chrome", () => {
  test("renders exactly one Shell header (no duplicate top row)", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Το προφίλ μου" })).toBeVisible();

    // Shell is the only source of <header>. Two = the nested-Shell regression.
    await expect(page.locator("header")).toHaveCount(1);

    // The 👤 entry point lives once, in the Shell header.
    await expect(page.getByRole("link", { name: "Το προφίλ μου" })).toHaveCount(1);
  });
});

test.describe("Landing page — profile entry point", () => {
  test("has a single 👤 entry (Shell header only) and no Σύνδεση chip", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Only the Shell header's 👤 — the redundant ProfileChip was removed.
    await expect(page.getByRole("link", { name: "Το προφίλ μου" })).toHaveCount(1);

    // The chip's "Σύνδεση" nudge no longer appears on the landing page.
    await expect(page.getByText("Σύνδεση", { exact: true })).toHaveCount(0);
  });
});
