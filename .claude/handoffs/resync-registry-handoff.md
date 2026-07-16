# Handoff — Multi-game premade-data re-sync registry

**Goal:** make an accepted Leksikastirio nomination keep the premade data of *every*
dictionary-derived game correct — not just Leksokipos. Build it as a **resync registry**
(one seam, per-game adapters) and TDD it slice by slice.

**Status:** planned + architecturally validated (`/improve-codebase-architecture` +
`/codebase-design`). Not started.

---

## Why (the gap)

`apply-nominations.mjs` patches `words-el.json` + `leksiarxeio/words-{4–8}.json`, then
re-syncs **only Leksokipos** puzzles (`scripts/lib/resync-puzzles.mjs`). Other games with
premade content dictionary-derived from `words-el.json` silently go stale:

| Game | Premade data | Dict-derived? | Currently re-synced? |
|------|-------------|---------------|----------------------|
| Leksokipos | `leksokipos/puzzles-el.json` `validWords` | yes | ✅ |
| Leksiarxeio | `leksiarxeio/words-{2–8}.json` (guess lists) | yes | ✅ |
| **Leksoplegma** | `leksoplegma/puzzles-el.json` `bonusWords` | **yes** (enum'd vs `words-el.json`) | ❌ **gap** |
| **Leksodromia** | `leksodromia/anagramAlternates.json` | **yes** (anagrams vs `words-el.json`) | ❌ **gap** |
| Vres Tin Frasi | `vrestifrasi/phrases-el.json` | no (phrases) | n/a — out of scope |

Scores are never touched — they live append-forever in `game_scores` and are never
recomputed. This work only fixes what **future** plays score. (See prior analysis: the
re-sync is date-agnostic but score-safe.)

---

## Architectural verdict (deletion test)

The root friction: **`apply-nominations.mjs` is the only data script run via plain `node`
+ `.mjs`.** Because it can't import TypeScript, it **re-mirrors** game logic:

- `normalise()` — duplicated in `apply-nominations.mjs`, `resync-puzzles.mjs`, and the real
  `src/lib/normalize.ts` / `src/games/leksokipos/lib/normalize.ts`.
- `puzzleAcceptsWord()` in `resync-puzzles.mjs` — its own header says *"mirror of
  computeValidWords.ts"*.

Deletion test on those mirrors: delete them and complexity **concentrates back into the
real game modules** — they're shallow duplications. The predicates we need already exist as
**deep, tested, exported** modules:

- Leksokipos: `computeValidWords` / predicate in `@/games/leksokipos/lib`
- Leksoplegma: `canTrace(word, letters, edges)` + `enumerateBonusWords(letters, paths, dict)`
  in `@/games/leksoplegma/lib/generator` — pure, prefix-pruned, already unit-tested
- normalise: `normalizeLetters` in `@/lib/normalize`

The only thing blocking reuse is the `.mjs` boundary.

### The two moves

1. **Enabling move — convert `apply-nominations.mjs` → `apply-nominations.ts`, run via `tsx`.**
   `tsx` is already a devDependency and runs every sibling data script
   (`generate-leksoplegma`, `generate-leksodromia-anagrams`, `batch-generate`, …). This lets
   adapters import the real predicates → **deletes every mirror** → single source of truth.

2. **Seam — a resync registry.** apply-nominations hardcodes one game's re-sync inline.
   Invert it: a registry of per-game **adapters** over one contract; the script becomes a
   thin orchestrator. Four real adapters (Leksokipos, Leksiarxeio, Leksoplegma, Leksodromia)
   ⇒ a genuine seam (two-adapters-real rule satisfied), not speculative.

**Deep-module shape (small interface, lots behind it):**

```ts
export interface DictionaryEdits { added: string[]; removed: string[]; } // already normalised

export interface ResyncReport {
  changed: Array<{ id?: string; added: string[]; removed: string[] }>;
  warnings: string[]; // things the script CANNOT auto-fix (see Leksoplegma required words)
}

export interface ResyncAdapter<Content> {
  id: string;                                  // 'leksokipos' | 'leksiarxeio' | ...
  load(): Content;                             // read this game's data file(s)
  resync(content: Content, edits: DictionaryEdits): { content: Content; report: ResyncReport };
  write(content: Content): void;               // write back only when report.changed non-empty
}
```

Orchestrator: fetch accepted noms → build `DictionaryEdits` → for each adapter
`load → resync → write-if-changed` → aggregate + print one unified report. `resync` stays
**pure** (content-in/content-out) so it's testable through its interface; `load`/`write` are
the I/O seam.

---

## Data-flow corrections (scope precisely — these bit the first analysis)

- Leksiarxeio has **two** file families: `words-{N}.json` (guess lists, ← nominations) and
  `answers-{N}.json` (**curated** answer pools, **NOT** nominations). Only `words-{N}` is in scope.
- **Leksoplegma `bonusWords`** are enumerated against full `words-el.json` → **in scope**.
  `add` = append the word to a puzzle's `bonusWords` iff `canTrace(word, letters, edges)`
  (derive `edges` from `paths` the way `validatePuzzle` does); `remove` = drop it.
- **Leksoplegma `paths` (required words)** come from curated pools and are baked into grid
  geometry — a puzzle **cannot accept an add**, and a `remove` of a word that is a required
  key **cannot be auto-fixed**. Emit a `warning` listing affected puzzle ids for manual
  regeneration; never silently mutate `paths`.
- **Leksodromia `anagramAlternates.json`** maps pool words → valid Greek anagrams enumerated
  against `words-el.json`. A nomination add/remove **can** change which anagrams are valid →
  **in scope**. v1: warning-only (`"run npm run generate-leksodromia-anagrams"`); v2: adapter
  regenerates just the touched entries.
- **Vres Tin Frasi**: phrase-based, no dictionary derivation → **document as a deliberate
  registry omission** (a comment in the registry), so its absence reads as a decision.

---

## The durable win: a drift guard test

Because adapters become pure, TS-importable modules, add
`src/test/shared/premadeDataConsistency.test.ts` that runs **each** adapter's `resync` over
the **committed** data with the **current** `words-el.json` and asserts `report.changed` is
empty. Silent drift becomes a red test instead of a production bug. This is the piece that
keeps all games aligned permanently — do not skip it.

---

## TDD plan (red → green → refactor, vertical slices)

Follow `/tdd`. Each slice starts with a failing test. Run
`npm run test -- --run`, `npx eslint .`, `npm run build` after each (PowerShell; targeted
vitest batch if the full suite OOMs — see apply-nominations skill Notes).

**Slice 0 — enabling refactor (no behaviour change).**
Convert `apply-nominations.mjs` → `apply-nominations.ts`; update the `package.json` script to
`tsx`. Keep logic identical. Existing tests (`resyncPuzzles.test.mjs`, `resync-puzzles`) stay
green. ⚠️ **Risk:** env loading — current script uses `node --env-file-if-exists=.env
--env-file-if-exists=.env.local`. Verify `tsx` forwards those node flags; if not, load env
via `import "dotenv/config"` or tsx's env handling. Resolve this first.

**Slice 1 — extract the registry contract + move Leksokipos behind it.**
Create `scripts/lib/resync/` (`edits.ts`, `registry.ts`, `leksokipos.ts`). Import
`normalizeLetters` from `@/lib/normalize` and the validity predicate from
`@/games/leksokipos/lib` — **delete** the mirrored `normalise` + `puzzleAcceptsWord`.
Pure refactor; port `resyncPuzzles.test.mjs` to drive the adapter. Green with no behaviour change.

**Slice 2 — Leksiarxeio adapter.** Move the inline len-4–8 `words-{N}.json` list patching
out of the orchestrator into its adapter. Test: add/remove routes to the right length bucket.

**Slice 3 — Leksoplegma adapter (closes gap #1).** Test-first:
`add` appends to `bonusWords` only when traceable (`canTrace`); `remove` drops from
`bonusWords`; `remove` of a required `paths` key produces a `warning` and leaves `paths`
untouched. Reuse `canTrace`/`enumerateBonusWords` from `@/games/leksoplegma/lib/generator` —
do not reimplement.

**Slice 4 — Leksodromia adapter (closes gap #2).** v1 warning-only: if any edit touches a
pool word (or its anagram class), emit `"regenerate anagramAlternates"`. Optional v2:
regenerate touched entries.

**Slice 5 — drift guard.** `premadeDataConsistency.test.ts` (above). If it surfaces existing
staleness on `main`, backfill by running the new re-sync once and committing the data diff
separately from the code.

**Slice 6 — docs.** Update the `/apply-nominations` skill (`skill.md`) “What gets written”
table to list all synced games; note Leksoplegma required-word warnings + Leksodromia regen.
Add an ADR under `docs/adr/` recording the registry seam + the `.mjs→.ts` conversion.

---

## Key files

- Orchestrator: `scripts/apply-nominations.mjs` → becomes `.ts`
- Existing re-sync (to relocate): `scripts/lib/resync-puzzles.mjs`
- Predicates to reuse (do not mirror): `src/games/leksokipos/lib/computeValidWords.ts`,
  `src/games/leksoplegma/lib/generator.ts` (`canTrace`, `enumerateBonusWords`),
  `src/lib/normalize.ts`
- Data: `src/data/{leksokipos,leksoplegma,leksodromia}/…`, `src/data/leksiarxeio/words-{N}.json`
- Config: `src/config/games.ts` (`RegistryGameId`) — reuse for adapter ids, don't hardcode
- Tests: `src/test/scripts/resyncPuzzles.test.mjs` (port), new
  `src/test/shared/premadeDataConsistency.test.ts`

## Constraints (from CLAUDE.md)

Game logic in `src/games/*/lib/` stays pure (zero React). No new deps (tsx, dotenv already
present — confirm dotenv before assuming). Import config values, never hardcode. Semantic
tokens only if any UI is touched (none expected). One shared Supabase project backs dev+prod
— the script only reads noms + writes local JSON, so no DB write risk here.
