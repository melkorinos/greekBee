import { expect, test } from "./fixtures";

test.describe("all games load", () => {
  test("Spelling Bee — redirects and renders honeycomb", async ({ spellingBee }) => {
    await spellingBee.goto();
    await expect(spellingBee.honeycomb).toBeVisible();
  });

  test("Wordle GR — renders page heading", async ({ wordle }) => {
    await wordle.goto();
    await expect(wordle.heading).toBeVisible();
  });

  test("Connections — renders page heading", async ({ connections }) => {
    await connections.goto();
    await expect(connections.heading).toBeVisible();
  });
});
