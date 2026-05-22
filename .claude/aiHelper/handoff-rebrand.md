# Handoff — Platform & Game Rebrand (Leksarxeia)

## Context

This is a Greek word games platform currently named "Παιχνίδια Λέξεων" (Word Games in Greek).
It hosts 3 games, all of which are being rebranded away from NYT-adjacent names for copyright safety.
This handoff covers all text, routing, store-key, and type changes across all 3 games.
Visual redesign (flower grid UI, colour palette, logo) is a **separate future task** — do not implement it here.

---

## Decisions already made (do not re-litigate)

| Item | Decision |
|---|---|
| Platform name | **Leksarxeia** |
| Game 1 name | **Leksokipos** (replaces Spelling Bee) |
| Game 2 name | **Leksiarxeio** (replaces Wordle GR) |
| Game 3 name | **Leksindeseis** (replaces Connections) |
| Store data migration | **Start fresh** — no migration from old keys |
| Dark mode | Keep in mind; do not implement now |
| Disclaimer footer | **Do not add** |
| Visual redesign (flower grid, colours, logo) | **Out of scope** — separate task |

---

## What to change

### 1. Platform name — replace everywhere it appears as text

Search for and replace **both** of:
- `"Παιχνίδια Λέξεων"` (Greek)
- `"Word Games"` (English, may appear in metadata/page title)

Replace with: `Leksarxeia`

Known locations (verify search catches all):
- `src/app/page.tsx` — h1 heading
- Any `<title>`, `metadata`, or `layout.tsx` that uses the platform name

---

### 2. Game 1: Spelling Bee → Leksokipos

#### Route rename
- `src/app/spelling-bee/` → `src/app/leksokipos/`
- `src/app/spelling-bee/[center]/[outer]/` → `src/app/leksokipos/[center]/[outer]/`
- All internal `redirect()` calls that reference `/spelling-bee/...` → `/leksokipos/...`

#### Store / type changes
- `src/types/index.ts`:
  - `GameId`: remove `"spelling-bee"`, add `"leksokipos"`
  - `PersistenceEnvelope`: rename `"spelling-bee"?` → `"leksokipos"?`
- `src/games/spelling-bee/hooks/useGameState.ts`:
  - Both `readSlice("spelling-bee")` and `writeSlice("spelling-bee", ...)` → `"leksokipos"`
  - The `useRoundPersistence("spelling-bee", ...)` call → `"leksokipos"`
  - The old-format migration block that writes `writeSlice("spelling-bee", ...)` → `"leksokipos"`
- `src/hooks/useGameStore.ts`:
  - `migrateFromLegacyKeys()`: the legacy key comment and `envelope["spelling-bee"]` check → `"leksokipos"`. Since we start fresh, simplify or remove this migration — old data is intentionally abandoned.

#### Rank names — update the type and the RANKS array

File: `src/games/spelling-bee/types.ts` — update `RankName` union:
```ts
export type RankName =
  | "Σπόρος"
  | "Βλαστός"
  | "Μπουμπούκι"
  | "Άνοιγμα"
  | "Ανθισμένο"
  | "Θαυμαστό"
  | "Ευφυΐα"
  | "Άνθος";
```

File: `src/games/spelling-bee/lib/ranking.ts` — update `RANKS` array to match:
```ts
export const RANKS: Rank[] = [
  { name: "Σπόρος",     threshold: 0  },
  { name: "Βλαστός",    threshold: 6  },
  { name: "Μπουμπούκι", threshold: 12 },
  { name: "Άνοιγμα",   threshold: 20 },
  { name: "Ανθισμένο",  threshold: 30 },
  { name: "Θαυμαστό",   threshold: 42 },
  { name: "Ευφυΐα",     threshold: 55 },
  { name: "Άνθος",      threshold: 80 },
];
```
Also update the `calculateRank` fallback: `return "Σπόρος"` (was `"Beginner"`).

#### Text / copy changes

`src/app/leksokipos/[center]/[outer]/page.tsx`:
- h1: `"🍯 Spelling Bee"` → `"🌸 Leksokipos"`
- `aria-label` on the SVG grid: `"Spelling Bee honeycomb grid"` → `"Leksokipos flower grid"` (grid component itself)
- `generateMetadata`: title strings replace `"Spelling Bee"` with `"Leksokipos"`

`src/components/spelling-bee/HowToPlayModal.tsx`:
- `TITLE`: `"Πώς να παίξεις — Spelling Bee"` → `"Πώς να παίξεις — Leksokipos"`
- `bulletIcon`: `"🐝"` → `"🌸"`
- Last rule item: update rank reference from `"Βασίλισσα"` to `"Άνθος"`

`src/components/spelling-bee/HoneycombGrid.tsx`:
- `aria-label`: `"Spelling Bee honeycomb grid"` → `"Leksokipos grid"`

`src/app/page.tsx` — update the `"spelling-bee"` game entry:
```ts
{
  id:          "leksokipos",
  emoji:       "🌸",
  title:       "Leksokipos",
  description: "Βρες λέξεις με τα 7 γράμματα του κήπου.",
  href:        "/leksokipos",
  rulesTitle:  "Πώς να παίξεις — Leksokipos",
  bulletIcon:  "🌸",
  rules: [
    // keep existing rules, update last line rank reference to "Άνθος"
  ],
}
```

---

### 3. Game 2: Wordle GR → Leksiarxeio

#### Route rename
Locate the Wordle route (likely `src/app/wordle/`) — rename to `src/app/leksiarxeio/`.
Update all internal links and redirects from `/wordle/...` → `/leksiarxeio/...`.

#### Store / type changes
- `src/types/index.ts`:
  - `GameId`: `"wordle"` → `"leksiarxeio"` (check if `"wordle-identity"` is separate — if so, rename to `"leksiarxeio-identity"` or equivalent)
  - `PersistenceEnvelope`: `"wordle"?` → `"leksiarxeio"?`
- Any hook or file that calls `readSlice("wordle")` / `writeSlice("wordle", ...)` → `"leksiarxeio"`

#### Text changes
- All user-visible `"Wordle GR"` → `"Leksiarxeio"`
- Page h1, metadata titles, HowToPlay modal title, home page game card

---

### 4. Game 3: Connections → Leksindeseis

#### Route rename
`src/app/connections/` → `src/app/leksindeseis/`
Update all internal links and redirects.

#### Store / type changes
- `src/types/index.ts`:
  - `GameId`: `"connections"` → `"leksindeseis"`
  - `PersistenceEnvelope`: `"connections"?` → `"leksindeseis"?`
- Any hook or file that calls `readSlice("connections")` / `writeSlice("connections", ...)` → `"leksindeseis"`

#### Text changes
- All user-visible `"Connections"` → `"Leksindeseis"`
- Page h1, metadata titles, HowToPlay modal title, home page game card

---

## Tests to update

### Unit tests (rank strings)
Files that reference old rank names (`"Beginner"`, `"Queen Bee"`, `"Moving Up"`, etc.):
- `src/test/spelling-bee/gameLogic.test.ts` — update rank string assertions
- `src/test/spelling-bee/gameReducer.test.ts` — update rank string assertions

### E2E tests (routes)
- `e2e/pages/SpellingBeePage.ts`:
  - `goto()`: `/spelling-bee` → `/leksokipos`
  - `waitForURL` pattern: `/spelling-bee/` → `/leksokipos/`
- `e2e/games.spec.ts`:
  - Test description: `"Spelling Bee — redirects and renders honeycomb"` → `"Leksokipos — redirects and renders grid"`
- Update equivalent page objects / spec entries for Wordle and Connections routes

### Any other test files referencing route strings
Run: `grep -r "spelling-bee\|/wordle\|/connections" src/test e2e` to catch anything missed.

---

## Mandatory post-change checklist (do not skip)

Per project protocol, after all changes:
1. `npm run test -- --run` → 0 failures
2. `npx eslint .` → 0 errors
3. `npm run build` → must succeed
4. Update `.claude/aiHelper/log.md` with what was done (keep under 250 lines)

---

## What is explicitly OUT OF SCOPE for this task

- Flower grid SVG component (replaces HoneycombGrid) — future visual task
- Coral + mint colour palette — future visual task
- Platform logo (L in different colour) — design task
- Dark mode — future task
- Any changes to `words-el.json` or `puzzles-*.json`
- Installing new dependencies

---

## Key file map (for orientation)

| Purpose | Path |
|---|---|
| Platform types (GameId, PersistenceEnvelope) | `src/types/index.ts` |
| localStorage store | `src/hooks/useGameStore.ts` |
| Spelling Bee game hook | `src/games/spelling-bee/hooks/useGameState.ts` |
| Rank names & thresholds | `src/games/spelling-bee/lib/ranking.ts` |
| Rank type | `src/games/spelling-bee/types.ts` |
| Spelling Bee components | `src/components/spelling-bee/` |
| Home page (game cards) | `src/app/page.tsx` |
| Spelling Bee route (redirect) | `src/app/spelling-bee/page.tsx` |
| Spelling Bee route (game) | `src/app/spelling-bee/[center]/[outer]/page.tsx` |
| E2E page objects | `e2e/pages/` |
| E2E specs | `e2e/games.spec.ts` |

---

## Standing project rules (never violate)

- PowerShell only — use `Select-Object -Last N`, never `tail`
- No new dependencies without explicit user approval
- Game logic in `src/games/*/lib/` must stay pure functions — zero React imports
- Each game reads/writes only its own store slice
- No inline styles — Tailwind utility classes only
- Do not touch `words-el.json` or any `puzzles-*.json`
- Keep `log.md` under 250 lines
