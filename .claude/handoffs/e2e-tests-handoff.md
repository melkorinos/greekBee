# Handoff: E2E Tests (issue 01)

**Date:** 2026-07-02  
**Status:** Scaffold complete — two flow tests + one CI tweak still needed  
**Next session focus:** Implement `e2e/flows.spec.ts` and extend the two POMs

---

## What already exists — do not rebuild

| File | What it does |
|------|--------------|
| `playwright.config.ts` | Chromium only, `baseURL: http://localhost:3000`, `webServer` spins dev locally / serves production build on CI |
| `.github/workflows/e2e.yml` | Runs on push + PR to `main` (needs `dev` added — see Task 1) |
| `e2e/fixtures.ts` | `test` extended with `leksokipos`, `leksiarxeio`, `leksindeseis` page-object fixtures |
| `e2e/pages/LeksokiposPage.ts` | `goto()` + `honeycomb` locator — extend, don't replace |
| `e2e/pages/LeksiarxeioPage.ts` | `goto()` + `heading` locator — extend, don't replace |
| `e2e/pages/LeksindeseisPage.ts` | `goto()` + `heading` locator — untouched |
| `e2e/games.spec.ts` | 3 smoke/load tests — leave as-is |

CI already satisfies acceptance criterion 3. The two flow tests are the remaining gap.

---

## Task 1 — CI: add `dev` branch trigger

In `.github/workflows/e2e.yml`, change:

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

to:

```yaml
on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]
```

---

## Task 2 — Extend `LeksokiposPage`

Add to `e2e/pages/LeksokiposPage.ts`:

```typescript
readonly foundWordsCount;

constructor(private page: Page) {
  this.honeycomb      = page.locator("svg").first();
  this.foundWordsCount = page.getByTestId("found-words-count");
}

async gotoCustom(center: string, outer: string) {
  await this.page.goto(`/leksokipos/${center}/${outer}`);
  await this.page.waitForURL(/\/leksokipos\/.+\/.+/);
  // Wait for the game board to mount (SVG renders after puzzle hydration)
  await this.honeycomb.waitFor();
}

async typeWord(word: string) {
  await this.page.keyboard.type(word);
}

async submitWord() {
  await this.page.keyboard.press("Enter");
}
```

---

## Task 3 — Extend `LeksiarxeioPage`

Add to `e2e/pages/LeksiarxeioPage.ts`:

```typescript
readonly lengthDisplay;
readonly firstGuessRow;

constructor(private page: Page) {
  this.heading       = page.getByRole("heading", { name: /Leksiarxeio/i });
  this.lengthDisplay = page.locator('span.tabular-nums');   // the "4"/"5"/… counter between − and +
  this.firstGuessRow = page.getByTestId("guess-grid").locator('[data-row="0"]');
}

async nextLength() {
  await this.page.getByRole("button", { name: "Μεγαλύτερο μήκος" }).click();
}

async typeWord(word: string) {
  await this.page.keyboard.type(word);
}

async submitGuess() {
  await this.page.getByTestId("btn-enter").click();
}
```

> **Note on `firstGuessRow`:** check the rendered HTML of `GuessGrid` to confirm the exact selector; add a `data-testid="guess-row-0"` if needed. The important assertion is that *some* tile row contains non-empty tiles after submission.

---

## Task 4 — Create `e2e/flows.spec.ts`

```typescript
import { expect, test } from "./fixtures";

// ── Leksokipos: custom puzzle → word submission → reload → rehydration ────────

test.describe("Leksokipos flow", () => {
  // Fixture: center α (greeklish: a), outer λεοσρτ (greeklish: elorst).
  // Verified: 424 valid words in words-el.json, including αλασ (4 letters, 1 pt).
  // Custom puzzles are excluded from the Leaderboard; no DB noise from this test.
  const CENTER = "a";
  const OUTER  = "elorst";
  const WORD   = "αλασ";   // normalised Greek — no accents

  test("word submission → score update → reload → state rehydrates", async ({ leksokipos, page }) => {
    await leksokipos.gotoCustom(CENTER, OUTER);

    await leksokipos.typeWord(WORD);
    await leksokipos.submitWord();

    await expect(leksokipos.foundWordsCount).toHaveText("1");

    await page.reload();
    await leksokipos.honeycomb.waitFor();

    // useGameStore restores foundWords from localStorage on remount
    await expect(leksokipos.foundWordsCount).toHaveText("1");
  });
});

// ── Leksiarxeio: length-switcher → guess cycle ────────────────────────────────

test.describe("Leksiarxeio flow", () => {
  test("length-switcher changes active puzzle + guess is processed", async ({ leksiarxeio }) => {
    await leksiarxeio.goto();
    await expect(leksiarxeio.heading).toBeVisible();

    // Board defaults to length 4; switch to 5
    await leksiarxeio.nextLength();
    await expect(leksiarxeio.lengthDisplay).toHaveText("5");

    // Type a valid 5-letter Greek word (not the answer — just needs to pass validation
    // so tiles appear). αρετη is a common word; verify it is in words-5.json first.
    await leksiarxeio.typeWord("αρετη");
    await leksiarxeio.submitGuess();

    // A tile row should now contain coloured tiles — proves the guess pipeline fired
    await expect(leksiarxeio.firstGuessRow).toBeVisible();
  });
});
```

---

## Verified fixture

| Field | Greek | Greeklish |
|-------|-------|-----------|
| Center | α | `a` |
| Outer | λεοσρτ | `elorst` |
| Test word | αλασ | `alas` |
| Valid word count | 424 | — |

Greeklish codec (`src/lib/greeklish.ts`): a→α e→ε l→λ o→ο r→ρ s→σ t→τ.

---

## Key selectors reference

| Element | Selector |
|---------|----------|
| Found-words count | `[data-testid="found-words-count"]` |
| Enter button (Leksiarxeio keyboard) | `[data-testid="btn-enter"]` |
| Length switcher + | `role=button name="Μεγαλύτερο μήκος"` |
| Length switcher − | `role=button name="Μικρότερο μήκος"` |
| Feedback (word accepted, Leksokipos) | `[data-testid="feedback-word-accepted"]` |
| Score bar | `[data-testid="score-bar"]` |

---

## Decision log (abbreviated)

| Decision | Choice | Reason |
|----------|--------|--------|
| Leksokipos word source | Custom Puzzle URL | Decouples from daily rotation; deterministic |
| Leksiarxeio answer strategy | No answer needed | Community puzzle non-determinism makes win-path flaky |
| "Full guess cycle" scope | One valid guess → tiles visible | Proves pipeline without needing the secret answer |
| Length to test | 4 → 5 (via + click) | Default start, single switch, realistic length |
| Supabase writes | Let fire | Custom puzzles excluded from leaderboard; profileLinked=false = no-op sync |
| Rehydration assertion | `found-words-count` text = "1" | Stable, derived from foundWords array in store |
| File organisation | `e2e/flows.spec.ts` | Smoke tests (`games.spec.ts`) stay fast and separate |
| POM strategy | Extend existing classes | Selectors stay co-located; smoke tests inherit new locators for free |

---

## Running locally

```powershell
npm run test:e2e          # headless
npm run test:e2e:ui       # headed with Playwright UI
npx playwright test e2e/flows.spec.ts   # flow tests only
```
