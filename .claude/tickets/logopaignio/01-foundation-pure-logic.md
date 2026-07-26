# 01 — Foundation & pure game logic (wip build)

**Source spec:** `.claude/handoffs/logopaignio.md`

**What to build:** The `logopaignio` game exists as a registered, `wip:true` daily game whose entire rules engine is implemented as pure, unit-tested functions, and whose route `/logopaignio` resolves to a single placeholder puzzle. No real UI polish and no real content yet — this is the tested spine every later ticket builds on. Mirrors how Πόσο κάνει; first shipped (foundation + one placeholder, wip).

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Registered in the game registry — id `logopaignio`, Greek title «Λογοπαίγνιο», emoji, route `/logopaignio` — and in the persistence-slice union; `wip:true`.
- [ ] `LOGOPAIGNIO` tuning block added to the game-rules config: `MAX_GUESSES` (5–6), points-per-guess-left, blur step count + per-step radii. Nothing hardcoded outside config.
- [ ] Types added (`LogopaignioPuzzle { id; date?; brand; sector; accept: string[]; markAsset; credit? }`, guess record, round state).
- [ ] Pure `lib/` (zero React imports): `evaluateGuess` matches with accent/case/whitespace normalization **plus** a per-brand accept-list covering the Greek⇄Latin fork; `scoring` clones the POSOKANEI decay shape (full points on a fully-blurred first-guess solve, decay per reveal step, **0 on give-up**); reducer derives all flags from guess history so RESTORE = replay, invalid/empty guesses no-op, give-up via a `GIVE_UP` action + `gaveUp` flag; `selectDailyPuzzle` = exact-`date` match else `dateToIndex` rotation (one row always renders); `shareText` is spoiler-free (no logo, no brand name).
- [ ] Unit tests cover matching edge cases (Greek vs Latin spelling, accents, case, whitespace), scoring decay, reducer replay + give-up, and daily selection.
- [ ] One placeholder puzzle so `/logopaignio` resolves.
- [ ] `npm run test -- --run`, `npx eslint .`, `npm run build` all green.
