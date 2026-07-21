# Handoff 02 — Topothesies: Pure game logic (TDD)

**Status:** ready-for-agent · **Prereq:** 01 foundation shipped — `types.ts` + `confirmedSplits.ts` are real now. `answers.json` data is **not emitted yet** (deferred to the emission session), so build/test against a small **fixture** matching the types. · **Blocks:** 03
**Approach:** `/tdd`, red-green-refactor. Everything here is **pure functions in `src/games/topothesies/lib/` — zero React imports** (soul.md hard rule).

See handoff 01 for the full locked-decision table (incl. the **Island splits** section — a "unit" answer may be a split-off island, not only a regional unit; the answer set is ~70–90 entries). Nothing here hardcodes the count, so this is FYI, not a code change. One tuning caveat: some split islands are tightly clustered (the Saronic group — Aegina/Agistri/Poros/Spetses), so their centroids sit only a few km apart — keep `proximityPct` honest at short range (near-neighbour islets should read "very close", but the exact-match check is still id-based, so this is only cosmetic).

Recap of what logic must implement:
- Two stages: **4** shape guesses → **3** capital guesses (bonus).
- Full Worldle hints: distance + 8-way arrow + proximity %, scaled to `TOPOTHESIES.PROXIMITY_MAX_KM` (from 01), not the globe.
- Accent-insensitive matching via the shared `normalizeLetters`.
- Score = f(shape guesses left, of 4) + capital bonus g(capital guesses left, of 3). Numeric knobs come from `gameRules.ts` — **import, never hardcode**.
- **Data boundary (perf):** logic touches **`answers.json` metadata only** (names, centroids, capitals, aliases) and must **never import `shapes.json`** — geometry is display-only (handoff 03). Hints operate on the real `[lng,lat]` centroid/`capitalCoord`, not the path. This keeps the megabyte-scale geometry out of anything that imports the logic module.

## Functions to build (all pure)

1. **`selectDailyPuzzle(dateISO, answers)`** — seeded deterministic pick of one unit per day (reuse the platform's existing daily-selection idiom; look at `leksodromia`/`leksoplegma` lib for the seeding pattern before inventing one). **Uniform pick — no difficulty weighting** (easy/hard days are intended variance, operator decision).
2. **Geo hint math:**
   - `haversineKm(a, b)` between two `[lng,lat]`.
   - `bearingToArrow(from, to)` → one of 8 direction glyphs (↑ ↗ → ↘ ↓ ↙ ← ↖).
   - `proximityPct(distanceKm)` → 0–100, scaled to `PROXIMITY_MAX_KM` (small-country tuning — a wrong guess two units over should NOT read as ~99% like it would on a globe scale). **`PROXIMITY_MAX_KM` is still the placeholder `0`** (real value lands in the emission session) — so **guard against a `0`/undefined scale** (no divide-by-zero: clamp or return 0), and have tests **inject a known scale** rather than importing the live config value.
3. **`evaluateShapeGuess(guessId, target, answers)`** → `{ correct, distanceKm, arrow, proximityPct }`. Match is by id resolved from the accent-normalized name/aliases.
4. **`evaluateCapitalGuess(guess, target)`** → same hint shape, using `capitalCoord`. Candidate capitals = the answer set's capitals; normalize before compare.
5. **State machine / reducer** — single seam (mirror the other games' one-reducer pattern, e.g. `TRACE_WORD` in leksoplegma). Tracks: current stage, shape guesses used (max 4), capital guesses used (max 3), guess history with hint payloads, solved/failed flags per stage, final score. Transitions: shape solved OR 4 used → reveal unit, enter capital stage; capital solved OR 3 used → finished.
6. **`computeScore(state)`** — shape points + capital bonus per the gameRules knobs.
7. **`buildShareText(state)`** — Worldle-style emoji summary (🟩/⬛ per guess, arrows, capital line, score). No accents/PII.

## Open detail — decide + note in the handoff log (don't block)
If the player **fails** the shape stage (4 used, wrong), does the capital stage still run?
**Default: yes** — reveal the unit name, let them attempt the capital for the bonus (educational). Flag for operator if you disagree; it's a one-line reducer branch either way.

## Handoff log — resolved in the session-115 build
- **Status: DONE.** All 7 functions + reducer built test-first in `src/games/topothesies/lib/` (six modules, 51 tests). Gates green.
- **Open detail decided — YES:** a failed shape stage still runs the capital stage (reveal the unit, capital bonus still earnable). Stages score independently (`computeScore` can award the capital bonus even when the shape stage failed). One-line reducer effect: stage flags are derived, so `shapeFailed` advances `stage` to `"capital"` exactly like `shapeSolved`.
- **Two deviations from the sketched signatures** (both to honour the "inject a known scale" + data-boundary rules):
  - Hint/evaluate fns take `maxKm` as an explicit param (`evaluateShapeGuess(guessId, target, answers, maxKm)`, `evaluateCapitalGuess(text, target, answers, maxKm)`); the reducer holds `maxKm` in state (injected via `makeInitialTopothesiesState`). Nothing imports the live `PROXIMITY_MAX_KM` (still `0`).
  - `evaluate*` return `{ correct, hint: GeoHint | null }` (nested) rather than a flat `{correct, distanceKm, arrow, proximityPct}` — matches the reducer's guess records; a correct guess carries `hint: null`.
- **Input rule:** a guess is consumed only when VALID (autocomplete-resolvable). Typos (unresolved shape name) and non-candidate capitals no-op — they never burn a guess. UI (03) should constrain input to the answer/capital lists anyway.
- **State shape:** `TopothesiesState` holds the `answers` candidate set (metadata only, never shapes.json) for resolving typed guesses. Persistence (03) should save only `shapeGuesses`/`capitalGuesses` (+ puzzleId) and rebuild via `makeInitialTopothesiesState` + `RESTORE_STATE` — mirrors leksoplegma/leksodromia.

## Gates
`npm run test -- --run`, `npx eslint .`, `npm run build` green. Grep `.claude/aiHelper/coverageMap.md` before adding a test file (extend if the function already appears). Every pure function gets a test; the reducer gets a state-transition suite (both-solved, shape-fail-then-capital, all-fail, scoring boundaries, proximity scaling).
