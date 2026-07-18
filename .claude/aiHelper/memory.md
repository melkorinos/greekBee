# Agent Memory — Greek Word Games Platform

## ⚡ Current State (2026-07-17)
Seven live games (incl. Λεξοδρομία + Λεξόπλεγμα, graduated from wip session 77) + custom puzzle URLs + the Leksikastirio word-court. Run `npm run test -- --run` for current count.

| Game | Route | Status |
|------|-------|--------|
| Leksokipos | `/leksokipos` + `/leksokipos/[center]/[outer]` | Live — daily + custom URL |
| Leksiarxeio | `/leksiarxeio` | Live — 4–8 letter Greek, multi-length |
| Leksindeseis | `/leksindeseis` | Live — community-first, static fallback |
| Vres Tin Frasi | `/vres-tin-frasi` | Live — daily Greek phrase |
| Stavrolekso | `/stavrolekso` | Live — community crossword browser + maker |
| Leksikastirio | `/leksikastirio` | Live — community word-court (voting + admin review) |
| Λεξοδρομία | `/leksodromia` | Live — daily anagram sprint, decay-to-floor scoring |
| Λεξόπλεγμα | `/leksoplegma` | Live — daily word-web (zanagrams-style), points scoring, no timer/bonus |

---

## 🔒 Locked Architecture Decisions (do not re-litigate)

| Topic | Decision |
|-------|----------|
| **Routing** | `/leksokipos`, `/leksiarxeio`, `/leksindeseis`, `/vres-tin-frasi`, `/leksodromia`, `/leksoplegma`, `/stavrolekso` (+ `/[id]`, `/maker`), `/leksikastirio`, `/` picker. Custom: `/leksokipos/[center]/[outer]` |
| **Persistence** | Single `wordgames:state` key. `useGameStore` is the ONLY localStorage writer. Exception: `leksokipos-variant` standalone key (display pref, not game state). |
| **Types** | Root `src/types/index.ts` = `Language`, `SliceId`, `PersistenceEnvelope` only. Game types in `src/games/*/types.ts`. (`SliceId` is the **persistence-slice** union, incl. `suggestions`/`reports`, `leksodromia`, `leksoplegma`; it is NOT the game registry — `stavrolekso`/`leksikastirio` have no store slice so they're absent by design. For "every registered game" use `RegistryGameId` from `@/config/games`.) |
| **Config / single sources of truth** | `src/config/` holds the platform's tuning knobs — never hardcode a value that lives here, import it. `games.ts` = `GAME_REGISTRY` + `RegistryGameId` (nav/picker/titles derive from it). `gameRules.ts` = every numeric knob per game (`LEKSOKIPOS.MIN_WORD_LENGTH/PANGRAM_BONUS/SCORE_SCALE/SOFT_CAP_KNEE/SOFT_CAP_K`, `LEKSIARXEIO.MAX_GUESSES/LENGTHS`, `VRESTIFRASI.MAX_GUESSES`, `LEKSINDESEIS.MAX_MISTAKES`, `STAVROLEKSO.VALID_GRID_SIZES`, `LEKSODROMIA.*` decay-scoring knobs, `LEKSOPLEGMA.*` word-web points knobs). `platform.ts` = brand name + derived SEO description. `retention.ts` = DB retention windows (cron). `LeksiarxeioLength` type must track `LEKSIARXEIO.LENGTHS`. |
| **Theming** | All pages = white/light mode by default. Manual dark/light toggle in Shell header (☀️/🌙). `.dark` class on `<html>` drives all dark styles — `prefers-color-scheme` NOT used. `dark:` Tailwind prefix is enabled via `@custom-variant dark` in `globals.css` (see ADR 0002). Preference stored in `localStorage` key `"theme-preference"`. **Semantic design tokens** are the single source for the palette: defined in `globals.css`, light on `:root` + dark under `.dark` (ADR 0008) — components reference tokens (`bg-surface`, `text-muted`), never `dark:` pairs. Feedback colours (green/yellow tile states, difficulty colours) are tokens too. **Status tokens** (2026-07-17): `warning`/`info` trios (base/-surface/-border) + `danger`/`success` companions + `--info-strong` — banners carry no `dark:` pairs. **Shape tokens**: `--radius-card`/`--radius-control`/`--shadow-card`, adopted only in `Modal.tsx` + `recipes.ts`. **Column width**: `--container-game: 24rem` → `max-w-game`, the ONLY way to write the platform column (`noLiteralColumnWidth.test.ts` bans literal `max-w-sm`). **Per-game brand accent** (ADR 0009): `--game-accent` / `--game-accent-foreground`, set per game via `[data-game="…"]` in `globals.css`, on the game's root wrapper — all 8 registry surfaces have a row (stavrolekso sky-600 + leksikastirio indigo-600 are invisible placeholders, no accent chrome renders there yet). **Page frame** = `GamePageShell` + `GameHeader` (`src/components/shared/`, server-compatible; exception: Leksokipos keeps a bespoke wrapper for its full-bleed header bar — only its header uses GameHeader; full-bleed vs padded is an open redesign decision). Class recipes: platform-shared in `src/styles/recipes.ts` (incl. `tooltipBubble`, `cardShell`/`cardShellInteractive`, `btnInfo`, `chipWarning`; recipes own colour/typography/radius, call sites own layout); Leksokipos-only in `src/components/leksokipos/styles.ts`. Shared modal shell = `src/components/shared/Modal.tsx` (`center`|`sheet`). **Deliberate raw-palette exceptions (do NOT "tokenise" — they'd regress):** `StavroleksoGrid` (functional crossword cells, black/white, already dark-handled — like tile colours), `Shell` slide-out drawer (intentionally always-dark `zinc-*`, no always-dark token), `FeedbackBanner` (explicit `theme` prop so games force their own look; no success/error surface-tint tokens exist), `FlowerGridPlayground` (dev-only tool), and the fixed-yellow chip `text-stone-900` in leksokipos `styles.ts`. |
| **Route envelope** | `src/lib/apiRoute.ts` owns what every `/api` route does before its own logic (ADR 0016). New routes use `parseJson` (never a hand-rolled `req.json()` try/catch) and `requireAdmin` (the `x-admin-secret` header is the **one** admin wire format; a bad secret is **401**, never 403). Error bodies stay `{ error: string }` but the string comes from one of two channels: `jsonError(code, detail?)` for envelope-owned codes — detail is logged, never sent, so **no route returns a raw Postgres message** — or `jsonMessage(text, status?)` for copy the route authors (validation, domain codes like `blocked_word`, and the Greek strings the UI renders verbatim). Deliberate exception: `/api/cleanup-scores` keeps raw messages — cron-only behind `CRON_SECRET`, so they're a diagnostic, not a leak. |
| **Game logic** | Pure functions in `src/games/*/lib/` — zero React imports. |
| **Shared components** | Graduate to `src/components/shared/` only when 2 games genuinely need it. |
| **Leksindeseis** | No `language` field on `LeksindeseisPuzzle`; identified by `date` alone. |
| **Custom puzzle ID** | `custom-{center}-{sortedOuter}` — not date-scoped. |
| **No Greek accents** | Zero accents in URLs, stored state, puzzle letters, valid-word output. `normalizeLetters()` is the single normalisation point. |
| **Custom URL** | Greeklish bijective codec (`src/lib/greeklish.ts`). Canonical 301 redirect on unnormalised params. |
| **Supabase** | Singleton in `src/lib/supabase.ts`. `getOrCreateDeviceId()` generates stable UUID stored under `deviceId` in the envelope. **Schema is version-controlled** in `supabase/migrations/` (authoritative DDL + RLS); change it via a new migration + `npx supabase db push` (no Docker), never via dashboard/MCP alone or it drifts. When push is blocked (missing `SUPABASE_DB_URL`, or a deploy-coupled migration pending), the sanctioned fallback is MCP `apply_migration` **with the matching file committed** — but it records an invented history version, so the file's version must be `migration repair`ed at the next push (list lives in the deploy runbook handoff). `CONTEXT.md` documents table *purpose* only. |
| **Profile identity** | No PIN. Profile = device_uuid row in `player_profiles`. Cross-device: generate 6-char transfer code via `POST /api/transfer`, claim on other device via `POST /api/transfer/claim`. `useProfile` hook shared across games. `ProfileSection` component shared in `src/components/shared/`. Google OAuth links device identity to an `auth_user_id` on `player_profiles`, which is the durable identity anchor; Sign-in Restore adopts the account's device_uuid and merges history. `/api/auth/link` derives `auth_user_id` from the verified JWT and writes `identity_audit`; it no longer stamps `game_scores` (column dropped). See ADR 0012 (supersedes 0007). |
| **Leaderboard** | Per-puzzle daily only. Silent upsert on score increase. 7-day rolling window. Custom puzzles excluded. |
| **Leaderboard navigation** | Rolling 7-day pill strip. `getRecentPuzzleDates(7)` server-side. |
| **Future renames** | UI strings only — never directories, types, or routes. |
| **FlowerGrid themes** | `DEFAULT_PIE_CONFIG` + `DEFAULT_FLOWER_CONFIG` presets. Toggle in `LeksokiposLayout` header. |

---

## 📁 Folder Structure

```
src/
  app/          Routes + server components (leksokipos, leksiarxeio, leksindeseis, vres-tin-frasi, leksodromia, leksoplegma, stavrolekso, leksikastirio, api/)
  components/   shared/ · leksokipos/ · leksiarxeio/ · leksindeseis/ · vrestifrasi/ · leksodromia/ · leksoplegma/ · leksikastirio/
  games/        Pure logic: leksokipos/lib+hooks · leksiarxeio/lib+hooks · leksindeseis/hooks · vrestifrasi/lib+hooks · leksodromia/lib+hooks · leksoplegma/lib+hooks (lib incl. offline generator core) · stavrolekso/lib (note: also holds StavroleksoGrid.tsx, a React component)
  data/         leksokipos/puzzles-el.json · leksiarxeio/words-{2..8}.json + answers-{4..8}.json + answerPools.ts (answers reused read-only by leksodromia/ + leksoplegma/) · leksodromia/anagramAlternates.json · leksindeseis/puzzles-connections.json · leksoplegma/puzzles-el.json (committed generator batch, `npm run generate-leksoplegma`) · vrestifrasi/phrases-el.json · words-el.json (~795k)
  hooks/        useGameStore · usePlayerIdentity (bundles migrate+useGameIdentity+useProfile+useAuth for side-effect-free surfaces) · useGameIdentity · useScoreSubmission · useLiveScorePost (continuous-post + finish-once-open policy, shared by the round games; reads the spine's hasLiveActed) · useRoundPersistence · useGameStateSync · useLeaderboard · useProfileVerification · useProfile · useLeaderboardProfile · useTheme · useAuth · useDayChange
  lib/          apiRoute.ts (the route envelope) · greeklish.ts · postScore.ts · supabase.ts · communityPuzzleLifecycle.ts · scoreMerge.ts
  types/        index.ts
  test/         organised by game + shared/
supabase/       config.toml + migrations/ — version-controlled DB schema (authoritative)
```

---

## 🛠 Known Tech Debt
Tracked in `.claude/issue-tracker/issues/`. See that directory for status per item.

---

## 🧪 Test Coverage Map

> Before writing a new test, grep the `describe` column. If the function appears, read that file first.

| File | What is tested |
|------|----------------|
| `evaluateGuess.test.ts` | Two-pass Wordle evaluation — correct/present/absent/duplicate |
| `leksiarxeioReducer.test.ts` | ADD_LETTER, DELETE_LETTER, SUBMIT_GUESS (win/loss/invalid), RESTORE_STATE |
| `gameLogic.test.ts` (leksiarxeio) | `scoreLeksiarxeio`, `buildLetterStateMap` |
| `guessGrid.test.tsx` | Tile rendering, max-width per length |
| `header.test.tsx` | LeksiarxeioPageClient — 🏆, HowToPlay, scoring note |
| `theme.test.tsx` | Tile + Keyboard **light** theme classes (empty/pending/unknown states) |
| `dataLoader.test.ts` (leksiarxeio) | `getTodaysLeksiarxeioPuzzle`, `getAllTodaysLeksiarxeioPuzzles`, `getValidWords` |
| `gameLogic.test.ts` (leksokipos) | `isPangram`, `scoreWord`, `maxScore`, `calculateRank`, `validateWord` — Greek fixture (production alphabet; absorbed the former `greekLogic.test.ts` 2026-07-02) |
| `gameReducer.test.ts` | All reducer actions incl. SUBMIT_WORD, RESTORE_STATE |
| `GameBoard.test.tsx` | Rendering, keyboard, hex clicks, word submission, feedback |
| `LeksokiposLayout.test.tsx` | Variant toggle (pie↔flower), localStorage save/restore, tooFewWords |
| `greeklish.test.ts` | Bijective Greek↔greeklish codec round-trip |
| `leksokiposDataLoader.test.ts` | `getPuzzleForDate`, `getPuzzleById`, `getRandomPuzzle`, `getNextPuzzle` |
| `leksokiposRouting.test.ts` | Canonical URL round-trip for all pre-built puzzles |
| `computeValidWords.test.ts` | `computeValidWords` — inclusion, too-short, missing center, normalisation |
| `customPuzzle.test.tsx` | `buildCustomPuzzle` + `ShareButton` |
| `parseCustomUrl.test.ts` | `parseCustomUrl` — valid, invalid center/outer, uniqueness |
| `normalize.test.ts` | `normalizeLetters` — accents, ς→σ, edge cases |
| `noAccents.test.ts` | Accent-free invariant across puzzles, reducer, URL params |
| `leksindeseisReducer.test.ts` | SELECT_WORD, SUBMIT_GUESS (correct/wrong/one-away), terminal guard |
| `groupGrid.test.tsx` | Render, solved groups, selection, disabled |
| `dataLoader.test.ts` (leksindeseis) | `getTodaysLeksindeseisPuzzle` — date match, fallback, shape |
| `persistence.test.ts` | `useRoundPersistence` — hydration, saving, clear(), shouldSave |
| `useScoreSubmission.test.ts` | Unified hook — submit/submitWithName (Leksokipos, Leksindeseis, Vres Tin Frasi): dedup guard, enabled gate, is_perfect latch |
| `useLiveScorePost.test.ts` | Shared round-game posting policy — restored/untouched never posts (+never opens leaderboard), posts live score on every change, opens leaderboard once after delay on finish, custom delay |
| `useLeksiarxeioScoreSubmission.test.ts` | Leksiarxeio per-length posting — attempts→points mapping, deviceId gate, name ref |
| `useGuessRound.test.ts` | Shared guess-game spine — score-only-on-end, onGameEnd once, persist `{guesses,status}` + restore, save guard, per-puzzle sessions |
| `communityPuzzleLifecycle.test.ts` | submit/list/review handlers **+ `consumeApprovedPuzzle`** (claim oldest approved, delete by id, null on empty/error) |
| `apiRoute.test.ts` | The route envelope (ADR 0016), tested once instead of per route — `jsonError` code→status + detail logged-not-leaked, `jsonMessage` verbatim copy (incl. Greek at a chosen status), `parseJson` ok/invalid_json, `requireAdmin` header match, body-borne secret rejected, never fails open on unset `ADMIN_SECRET` |
| `leksokiposSync.test.ts` | `pushFoundWords` (wire shape, never throws) + `pullSnapshot` (rebuild snapshot+score, params, null on empty/null/error) — the cross-device sync wire |
| `useGameIdentity.test.ts` | SSR-safe DeviceId + DisplayName init, setter state updates |
| `usePlayerIdentity.test.ts` | Bundled identity module — migration-runs-before-device-read ordering, scalar fields from store, complete `leaderboardProps` bundle + wiring, `saveName` persists |
| `useGameStore.test.ts` | readSlice, writeSlice, clearSlice, deviceId, displayName, profileLinked, migration |
| `Shell.test.tsx` | Hamburger open/close/Escape, nav links, theme toggle (aria-label, `.dark` class on `documentElement`) |
| `letterPickerModal.test.tsx` | Center/outer selection, quality rules (vowel center, ≥2 vowels, consonants) |
| `feedbackMessage.test.tsx` | Valid/pangram/error statuses, suggest button |
| `nominationModal.test.tsx` | NominationModal — visibility, word field (readonly + editable), direction copy, close, POST payload, success/error states |
| `suggestions.test.ts` | `getSuggestedWords`, `markSuggested`, `isSuggested` |
| `wordInput.test.tsx` | Letter display, center-letter highlight, inline submit visibility |
| `deploymentReadiness.test.ts` | Statically imported data files exist and are not gitignored |
| `profileRoute.test.ts` | `GET /api/profile?device_uuid=` (exists/not/error) + `POST /api/profile` (upsert, 400 missing uuid) |
| `transferRoute.test.ts` | `POST /api/transfer` (code format, 400, 500) + `POST /api/transfer/claim` (valid, 404/410 used/expired, empty profile) |
| `leaderboardModal.test.tsx` (leksokipos) | Day strip, play link, ProfileSection (idle/claiming/linked/transfer), name editor |
| `useProfile.test.ts` | Cross-device profile hook — createProfile (payload/Ανώνυμος/failure), transfer generate+claim (deviceId adoption, restore flag, error surface), disconnect |
| `useLeaderboardProfile.test.ts` | Profile-aware save (unlinked→create+createError, linked→save) + `useLeaderboardProfileSlot` bundle (ProfileSection wiring, saveButtonAlwaysActive) |
| `dataLoader.test.ts` (vrestifrasi) | `getTodaysVresTinFrasiPuzzle` — community consume, static rotation fallback, `buildPuzzle` accent normalisation + wordLengths |
| `scoring.test.ts` (vrestifrasi) | `scoreVresTinFrasi` — 6→1 by attempts, 0 on loss, floor guard |
| `mobileLayout.test.tsx` | HowToPlayModal-specific overflow contracts only (list max-height/scroll, card clipping) — modal *shell* contracts live in `modal.test.tsx` |
| `modal.test.tsx` (shared) | Modal primitive — open/close gating, center/sheet variants, overlay-click + stopPropagation, close button, testid/aria pass-through (ADR 0009) |
| `recipes.test.ts` (shared) | Platform recipes — non-empty, button/leaderboard token contracts, no `dark:` pairs |
| `styles.test.ts` (leksokipos) | Leksokipos-local recipes — feedback/found-word/score-bar/give-up token contracts, no `dark:` pairs (ADR 0009) |
| `validateSubmission.test.ts` (×4: leksiarxeio, leksindeseis, vrestifrasi, stavrolekso) | Community Puzzle validation adapters as pure functions — per-game submission invariants; stavrolekso also `EDIT_PIN_PATTERN` + `validateStavroleksoData` (shared with PATCH edit route + maker) |
| `scoring.test.ts` (leksodromia) | `computeWordPoints` — decay-to-floor, hint costs, MIN clamp, perfect round = MAX_SCORE |
| `selectDailyWords.test.ts` | Deterministic 2×(4–8) selection; **never Leksiarxeio's same-day fallback answer** (cross-game leak guard) |
| `scrambleWord.test.ts` | Deterministic seeded scramble — multiset-preserving, never identity |
| `leksodromiaReducer.test.ts` | PICK_TILE/ADD_LETTER/REMOVE_LETTER/SUBMIT_WORD/USE_HINT (cap+prefix lock)/SKIP_WORD/RESTORE_STATE + selectors |
| `useLeksodromiaRound.test.ts` | `useElapsedClock` (visibility pause, reset/seed) + round spine (persist snapshot, refresh restores clock, post-restore reset, **hasLiveActed** false-on-restore/flips-on-live) |
| `board.test.tsx` (leksodromia) | Board — rack→answer row, wrong-submit feedback, hint reveal, two-phase skip, recap, single live score post (no re-post on restored finish); PageClient header + rules |
| `dataLoader.test.ts` (leksodromia) | `getTodaysLeksodromiaPuzzle` — 10 ascending words + parallel non-identity scrambles, deterministic, curated-pool membership |
| `graph.test.ts` (leksoplegma) | `edgeKey`/`edgesOf`/`liveTiles`/`liveEdges`/`isTraceValid` — undirected edge union, collapse rule, trace validation |
| `scoring.test.ts` (leksoplegma) | `computeScore` (length×10 + flat bonus − hints, floor) + `isPerfectRound` + LEKSOPLEGMA constants |
| `leksoplegmaReducer.test.ts` | TRACE_WORD required/bonus/miss/dup (incl. collapsed-bonus tension), USE_HINT auto-target + per-word cap, terminal state, RESTORE_STATE filtering |
| `generator.test.ts` (leksoplegma) | Offline generator core — constraint validation on real pools (coverage, adjacency, no crossing diagonals), determinism, `enumerateBonusWords` on fixture board |
| `dataLoader.test.ts` (leksoplegma) | `getPuzzleForDate` rotation + 365-date Leksiarxeio same-day answer-leak guard + `containsSameDayLeksiarxeioAnswer` |
| `board.test.tsx` (leksoplegma) | Board — tap-build trace seam, collapse rendering, hint chips, bonus counter, recap, single live score post + is_perfect, no re-post on restore; PageClient header + no-timer rules |
| `achievements.test.ts` (leksokipos) | Catalog + `detectEarnedAchievements` (4 one-shots — tzimani retired s108, daily gate) + `detectEarnedPointsTiers`/`detectEarnedPangramTiers` + `nextPangramTierThreshold` + `describeAchievement` |
| `achievementToast.test.tsx` | AchievementToast render + dismiss |
| `useAchievementSync.test.ts` | The detection lanes — posting, points tier, pangram delta-post, unlock-toast surfacing (earned-at-mount suppression), gating |
| `useDayChange.test.ts` | Day-rollover redirect — today's puzzle, past-puzzle leaderboard nav, custom puzzles |
| `useGameState.test.ts` | Cross-device server restore — gates, success, error handling, `restoreFromServer` |
| `missedWordsList.test.tsx` | MissedWordsList (give-up reveal) |
| `pangrams.test.ts` (leksokipos) | `sanitizePangramWords` shape guards (ADR 0013 B2) |
| `puzzle.test.ts` (leksokipos) | `isDailyPuzzle`, `isISODate` |
| `puzzleIndex.test.ts` | Slim puzzle index — drift guard vs full loader, `getPrebuiltPuzzleParams` canonical params |
| `randomPuzzle.test.ts` | `pickRandom7` quality rules |
| `rankDisplay.test.ts` | `rankProgress`, `getRankEmoji` |
| `answerPools.test.ts` (leksiarxeio) | `LEKSIARXEIO_ANSWER_POOLS` + `getSameDayFallbackAnswers` — seam == pool[dateToIndex] all year |
| `keyboardInteraction.test.tsx` (leksiarxeio) | On-screen keyboard letter/delete/enter dispatch end-to-end |
| `NominationCard.test.tsx` / `page.test.tsx` (leksikastirio) | Card render, vote highlight, voting, admin controls; page rendering, tabs, optimistic voting |
| `matching.test.ts` (leksindeseis) | `matchesGroup`, `isOneAway` |
| `evaluatePhraseGuess.test.ts` / `letterState.test.ts` (vrestifrasi) | Two-pass cross-word evaluation (ADR 0004); `buildPhraseLetterStateMap` 4-state priority |
| `lib.test.ts` (stavrolekso) | `autoNumberSlots`, `isConnected`, `normalizeAndCompare`, `getSlotLength`, `getSlotCells` |
| `auth-link.test.ts` (api) + `authLinkRoute.test.ts` (shared) | `POST /api/auth/link` — JWT security boundary, link/restore modes, occupied-device guard, `identity_audit`, error paths |
| `applyDictionaryEdits.test.ts` + `resync{Registry,Leksiarxeio,Leksokipos,Leksoplegma,Leksodromia}.test.ts` (scripts) | ADR 0015 re-sync — orchestrator (dictionary + registry walk), write gate, per-game adapters: additions/removals/no-ops |
| `IdentityHeader` / `LifetimeStatsStrip` / `NameEditor` / `TrophyCase` / `WelcomeBackBanner` / `WordsByLengthCard` (profile) | The six Profile Page components |
| `words.test.ts` (leksokipos) / `wordsByLength.test.ts` / `wordsMerge.test.ts` | `sanitizeFoundWords` shape guards · `bucketWordsByLength` (sparse RPC rows → 4…9/"10+") · `planWordsMerge` Restore union |
| `wordsRoute.test.ts` / `profileWordsRoute.test.ts` | `POST /api/words` (insert-if-absent, server-side `length`) · `GET /api/profile/words` (RPC → buckets) |
| `achievementMerge.test.ts` / `pangramMerge.test.ts` | `planAchievementMerge` / `planPangramMerge` — Sign-in Restore unions |
| `achievementsRoute.test.ts` / `pangramsRoute.test.ts` | `POST/GET /api/achievements` (id whitelist) · `POST /api/pangrams` (insert-if-absent, validation, DB errors) |
| `authCallbackRedirect.test.tsx` | `/auth/callback` redirect destination |
| `cleanupScoresRoute.test.ts` + `cleanupScoresLiveDb.test.ts` | Cron — CRON_SECRET auth, never touches append-forever tables; live-DB twin asserts the cron's **effect on seeded sentinels** (stale game_state pruned, fresh one kept, stale game_scores survives) — it invokes the real handler, so it prunes prod game_state as the nightly run does. Runs locally off `.env.local`; auto-skips in CI |
| `communityPuzzlesReviewRoute.test.ts` | PATCH review — auth + leksiarxeio/leksindeseis routes |
| `feedbackModal.test.tsx` | FeedbackModal — visibility, required text, submission, 60s throttle |
| `gameScoresRoute.test.ts` | `POST/GET /api/game-scores` — validation, locale-suffix strip, Leksiarxeio read-modify-write |
| `gameStateRoute.test.ts` | `POST/GET /api/game-state` |
| `lifetimeStats.test.ts` | `aggregateLifetimeStats` |
| `nominationBlocklist.test.ts` | `isBlockedWord` (proper-noun blocklist) **+ the disjointness guard**: `blocklist ∩ words-el.json` must equal `DEFERRED_BLOCKLIST_DICTIONARY_OVERLAP` (the 14 month names) exactly, and that allowlist may only shrink (pinned vs a frozen ceiling) |
| `nominationsRoute.test.ts` | Nominations GET/POST (422 blocked_word, 409 already_pending)/lookup/vote/review (header auth) |
| `noRawPaletteClasses.test.ts` / `noRawActionButtonColors.test.ts` | ADR 0008 guards — no literal neutral palette / no hand-rolled green-red action fills |
| `noLiteralColumnWidth.test.ts` | Column-width guard — no literal `max-w-sm` in shipped `.tsx`; the platform column is `max-w-game` (`--container-game`), no allowlist |
| `performance.test.ts` | Hotpath timing budgets — computeValidWords, buildCustomPuzzle cache, prebuilt scan |
| `placement.test.ts` | `countPodiumFinishes` (`{first,second,third}`, competition ranking — 90/90/80 ⇒ no 2nd) + `countFirstPlaceFinishes` wrapper |
| `postScore.test.ts` | `sanitizeDisplayName` |
| `premadeDataConsistency.test.ts` | ADR 0015 drift guard — every game, both directions (stale removal + missed addition), byte-identical write path |
| `profileSectionFunnel.test.tsx` / `profileSectionSignIn.test.tsx` | ProfileSection — /profile funnel link; Google sign-in offered whenever not AuthLinked (ADR 0012) |
| `profileStatsRoute.test.ts` | `GET /api/profile/stats` |
| `puzzleDate.test.ts` | `todayISO` / `getLast7Dates` (UTC anchoring) / `normalizePuzzleDate` / `resolvePuzzleDateParam` |
| `puzzleRotation.test.ts` | `dateToIndex` |
| `rlsInvariantsLiveDb.test.ts` | Live-DB RLS posture matrix. Runs locally off `.env.local` (`vitest.config.ts` forwards the 3 Supabase keys); auto-skips in CI, where live-DB secrets are deliberately absent |
| `scoreMerge.test.ts` | `planScoreMerge` (best-per-puzzle) + `mergeLengthScore` (Leksiarxeio fold; re-post overwrite documented) |
| `stavroleksoIdRoute.test.ts` | GET/PATCH stavrolekso `[id]` — PIN auth + state guards, "the edit actually persists" (service-role write) |
| `supabase.test.ts` | `getSupabaseClient`, `signInWithGoogle` |
| `useAuth.test.ts` | Session on mount / from store / sign-out |
| `useGameEndCallback.test.ts` | `useGameEndCallback` fires once |
| `useGameStateSync.test.ts` | Backfill on link + incremental push when linked |
| `useLeaderboard.test.ts` | Initial fetch, enabled flag, polling, manual refresh, custom buildUrl |
| `useProfileVerification.test.ts` | Profile-still-exists check — disconnect on gone, never on network error (offline users stay) |
| `validateWordsRoute.test.ts` | `POST /api/validate-words` |
