// offlineMode.spec.ts — the real-browser test for Offline Mode (ADR 0010).
//
// This suite exists because the unit tests could NOT catch the bug that shipped:
// they mocked `router.prefetch` as promise-returning, but the App Router's real
// signature is `(href, options?) => void`. Awaiting six `undefined`s resolves
// instantly, so activation reported "ready" before anything was cached and a player
// who went offline on that cue found nothing prefetched.
//
// Only a real browser with a real network cut can prove the routes are actually
// warm, so this is the seam that owns that guarantee.

import { expect, test } from "@playwright/test";

const OFFLINE_TOGGLE = /εκτός σύνδεσης/i;

// The drawer is a full-height column; at the default 720px viewport the Σύνδεση
// section sits below the fold and clicks never land ("element is outside of the
// viewport"). Give the window room so the harness measures the feature, not layout.
test.use({ viewport: { width: 1280, height: 1200 } });

/** Open the drawer and activate Offline Mode, waiting for it to report ready. */
async function activateOfflineMode(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /open menu/i }).click();
  const drawer = page.getByRole("navigation", { name: /game navigation/i });
  await drawer.getByRole("button", { name: OFFLINE_TOGGLE }).click();

  // The toggle must not claim readiness while routes are still being warmed.
  await expect(drawer.getByRole("button", { name: OFFLINE_TOGGLE }))
    .toHaveAttribute("aria-pressed", "true", { timeout: 15_000 });

  // Close the drawer — it stays open after the toggle, and leaving it open makes the
  // hamburger read "Close menu", which silently breaks any later /open menu/ lookup.
  // Escape rather than a click: the backdrop overlays the header and swallows it.
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
}

/** Open the drawer and click through to a game. */
async function navigateToGame(
  page: import("@playwright/test").Page,
  game: RegExp,
) {
  await page.getByRole("button", { name: /open menu/i }).click();
  const drawer = page.getByRole("navigation", { name: /game navigation/i });
  await drawer.getByRole("link", { name: game }).click();
}

// SKIPPED — these currently FAIL, and the failure is the finding, not a flake.
//
// Verified 2026-08-03 against both `next dev` and a production build: every game page
// is `force-dynamic`, so its payload is not served from cache on navigation. Neither
// `router.prefetch` nor an awaited `fetch` warm-up makes the route survive a network
// cut — navigating to it offline lands on `chrome-error://chromewebdata/`, exactly the
// connection error the operator hit in Firefox.
//
// Do NOT delete these tests and do NOT "fix" them by loosening the assertions. They
// are the acceptance criteria for whatever mechanism replaces route prefetching
// (realistically a service worker — see ADR 0010, which rejected one twice on the
// assumption prefetch would suffice). Un-skip when that lands.
test.describe.skip("Offline Mode — real network cut", () => {
  test("a game prefetched at activation still loads after the network drops", async ({
    page,
    context,
  }) => {
    // The exact sequence the operator reported: land on /, activate while online,
    // THEN go offline, then try to open a game.
    await page.goto("/");
    await activateOfflineMode(page);

    await context.setOffline(true);

    // Leaving / for a game route is a navigation the guard permits (the target is
    // in the prefetched set), so accept the confirm dialog if one appears.
    page.on("dialog", (d) => void d.accept());

    await navigateToGame(page, /leksiarxeio/i);

    // The symptom: without a warm cache the browser shows its connection-error page
    // instead of the game. Asserting on the game's own chrome (the Shell header is
    // present on the error page too) is what makes this red-capable.
    await expect(page).toHaveURL(/leksiarxeio/, { timeout: 15_000 });
    await expect(page.getByRole("button", { name: /open menu/i }))
      .toBeVisible({ timeout: 15_000 });
  });

  test("switching between two prefetched games works with no connection", async ({
    page,
    context,
  }) => {
    await page.goto("/leksokipos");
    await activateOfflineMode(page);

    await context.setOffline(true);
    page.on("dialog", (d) => void d.accept());

    for (const game of [/leksiarxeio/i, /leksodromia/i]) {
      await navigateToGame(page, game);
      // A dead page loses the Shell entirely, so the hamburger is the tightest
      // "did this route actually render" signal available offline.
      await expect(page.getByRole("button", { name: /open menu/i }))
        .toBeVisible({ timeout: 15_000 });
    }
  });
});
