# Agent Reflections — Greek Word Games Platform

## 2026-05-12 — Post-Phase 2 (Wordle GR)

### What went well
- Two-pass `evaluateGuess` algorithm handles duplicate letters correctly by design — frequency map in pass 2 prevents double-counting. The test suite caught a wrong test expectation (not a code bug), confirming the algorithm was right and the mental model in the test was wrong.
- Keeping Wordle logic entirely in pure functions (`src/games/wordle/lib/`) made it trivial to test without any React setup. All 27 new tests run in under 10ms combined.
- The deterministic daily answer (epoch-day offset mod list length) is simple, stateless, and timezone-safe because the date string is derived server-side and passed as a prop — no client clock involved.
- Pre-normalizing `words-el.json` (826k → 811k words) eliminates 14k accent-variant duplicates and removes the normalize step from all downstream scripts. Consistent with `words-5.json` format.

### Tensions to watch
- **Wordle answer pool quality**: The current answer pool is the full 9,568-word `words-5.json` (all valid guesses = all possible answers). Players will inevitably hit obscure, archaic, or technical words as the daily answer. A curated `answers-5.json` subset (~1,000–2,000 common words) should be the answer source while `words-5.json` remains the full valid-guess list.
- **`normalizeLetters` in Spelling Bee still normalizes validWords at index-build time** (`puzzle.validWords.map(normalizeLetters)`). Now that `words-el.json` is pre-normalized, re-generating `puzzles-el.json` from the new dictionary would make those words already clean, and the `.map(normalizeLetters)` call could be removed. Low priority since it's a one-time cost per puzzle load, but it's a hygiene item.
- **Physical keyboard on mobile**: `WordleBoard` listens to `window.keydown` — this works on desktop but does nothing on mobile (no physical keyboard). The on-screen `Keyboard` component handles mobile input, but there's no explicit test verifying that path.

### Open questions
- Wordle length variants (3–8 letters): deferred. When added, should `/wordle` be a variant picker or default to 5 and surface a length selector in-game?
- Should the home page show "✓ Played today" status per game using persisted state?
- Connections puzzle format: operator adds by editing JSON directly, or should there be a minimal admin UI?- **Theming (Phase 2.5):** Shell header stays light. Should the drawer also stay light when opened from a dark Wordle page, or adopt the game’s theme? Current decision: drawer is always light (simpler, consistent).
---

## 2026-05-12 — Post-Architecture Session

### What went well
- The grill-me process surfaced a genuinely important decision early: the `Puzzle` type in `src/types/index.ts` is entirely Spelling Bee-shaped. Without the interview, an agent might have tried to extend it to cover Wordle and Connections, creating a bloated god-type. Instead, the decision is clean: root types only hold `Language`, `GameId`, and the persistence envelope shape. Each game owns its own types.
- The persistence decision (single `wordgames:state` key with typed per-game slices) is elegant. It gives us one place to wipe all state, while making cross-game leakage structurally impossible through TypeScript's type system.
- Identifying `src/lib/index.ts` and `src/components/index.ts` as dangerous barrel files *before* we started building was important. Extending those barrels into a multi-game context would have created false shared surfaces.

### Tensions to watch
- **`normalizeLetters` is a genuine cross-game utility**: Greek text normalisation (NFD decomposition, final sigma → σ) will be needed by Wordle too. When Wordle is built, `normalizeLetters` should graduate to a true shared utility (e.g. `src/lib/normalize.ts` at the root, not under any game folder). Flag this when Phase 2 begins.
- **Connections has no word-list dependency**: This is a feature, not a problem. But it means the `Language` type and `puzzle.language` field are irrelevant for Connections. The `ConnectionsPuzzle` type should not include a `language` field — keep it lean.

### Risks
- **Wordle answer pool quality**: Using the full `words-el.json` as the answer pool for Wordle will produce unguessable words. A curated answer pool (common Greek words only, filtered by length) needs to be created before Wordle puzzles go live. The generator script should draw from this curated pool, not the full dictionary.
- **Connections puzzle freshness**: Since puzzles are hand-curated, the operator (the user) needs a clear, low-friction way to add new puzzles. A JSON schema + a simple validation script (does it have exactly 4 groups of exactly 4 words? no duplicate words?) would prevent malformed data from reaching production.

### Open questions (deferred)
- Will Wordle support both Greek and English word lengths, or Greek only for now?
- Should the game picker home page (`/`) show today's puzzle status for each game (e.g. "✓ Played today" badge)?
- When the visual rebrand happens, should it adopt a fully custom design system, or extend Tailwind with a custom theme?


### What went well
- The grill-me process surfaced a genuinely important decision early: the `Puzzle` type in `src/types/index.ts` is entirely Spelling Bee-shaped. Without the interview, an agent might have tried to extend it to cover Wordle and Connections, creating a bloated god-type. Instead, the decision is clean: root types only hold `Language`, `GameId`, and the persistence envelope shape. Each game owns its own types.
- The persistence decision (single `wordgames:state` key with typed per-game slices) is elegant. It gives us one place to wipe all state, while making cross-game leakage structurally impossible through TypeScript's type system.
- Identifying `src/lib/index.ts` and `src/components/index.ts` as dangerous barrel files *before* we started building was important. Extending those barrels into a multi-game context would have created false shared surfaces.

### Tensions to watch
- **`src/lib/` vs `src/games/spelling-bee/lib/`**: The move is correct architecturally, but it will break all existing import paths (`@/lib → @/games/spelling-bee/lib`). This must be done as a single atomic commit with a path alias update or find-and-replace — not piecemeal.
- **`normalizeLetters` is a genuine cross-game utility**: Greek text normalisation (NFD decomposition, final sigma → σ) will be needed by Wordle too. When Wordle is built, `normalizeLetters` should graduate to a true shared utility (e.g. `src/lib/normalize.ts` at the root, not under any game folder). Flag this when Phase 2 begins.
- **Connections has no word-list dependency**: This is a feature, not a problem. But it means the `Language` type and `puzzle.language` field are irrelevant for Connections. The `ConnectionsPuzzle` type should not include a `language` field — keep it lean.

### Risks
- **The restructure (Phase 1) is the highest-risk step**: It touches every import path in the codebase. Run `npm run test` and `npm run build` immediately after — do not proceed to Phase 2 until both pass cleanly.
- **Wordle answer pool quality**: Using the full `words-el.json` as the answer pool for Wordle will produce unguessable words. A curated answer pool (common Greek words only, filtered by length) needs to be created before Wordle puzzles go live. The generator script should draw from this curated pool, not the full dictionary.
- **Connections puzzle freshness**: Since puzzles are hand-curated, the operator (the user) needs a clear, low-friction way to add new puzzles. A JSON schema + a simple validation script (does it have exactly 4 groups of exactly 4 words? no duplicate words?) would prevent malformed data from reaching production.

### Open questions (deferred)
- Will Wordle support both Greek and English word lengths, or Greek only for now?
- Should the game picker home page (`/`) show today's puzzle status for each game (e.g. "✓ Played today" badge)?
- When the visual rebrand happens, should it adopt a fully custom design system, or extend Tailwind with a custom theme?
