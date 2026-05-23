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
