# Test Coverage Map — Greek Word Games Platform

> Moved out of `memory.md` 2026-07-18. **Not loaded at session start** — open this file only when writing, moving, or consolidating tests, and update it in the end-of-session Dream (soul.md).
> Before writing a new test, grep the left column. If the function appears, read that file first.

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
| `ScoreBar.test.tsx` (leksokipos) | Endgame "new content" cue on the ladder icon — pulses while unseen (`data-endgame-cue`), clears on first panel open, never below top rank |
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
| `achievements.test.ts` (leksokipos) | Catalog + `detectEarnedAchievements` (4 one-shots — tzimani retired s108, daily gate) + `detectEarnedPointsTiers`/`detectEarnedPangramTiers` + `nextPangramTierThreshold` + `describeAchievement` + the operator-approved `glyph` map + display-badge resolution (`SELECTABLE_BADGE_IDS`, `qualifyingEarnedIds`, `resolveDisplayBadge`, `TIER_MEDALS`) |
| `profileBadgeRoute.test.ts` | `POST/GET /api/profile/badge` — earned-id validation (400 unknown/tier id, 403 unowned), lazy profile upsert, null clears |
| `leaderboardBadge.test.tsx` | `LeaderboardBadge` chip — glyph, medal only for tiered, distinct element after the name |
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
| `gameScoresRoute.test.ts` | `POST/GET /api/game-scores` — validation, locale-suffix strip, Leksiarxeio read-modify-write, per-row display-badge fan-out (highest-tier resolution, dangling → no badge) |
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
| `everyPuzzleHasPangram.test.ts` | Leksokipos drift guard — every board has ≥1 pangram vs the current dictionary; the two legacy dates (2026-06-20, 06-30) are the only allowlisted exceptions |
| `topothesiesPlanDissolve.test.ts` (scripts) | Topothesies pipeline seam (a) — `planDissolve` split-mapping: override peels islands, un-overridden → regional-unit target (Deferred islands stay in parent), drops excluded (Troizinia-Methana), drop wins over override |
| `topothesiesValidateEmitted.test.ts` (scripts) | Topothesies pipeline seam (b) — `validateEmitted` gate: answer↔shape id parity both ways, confirmed-split ids present, coords in `GREECE_BBOX`, no accents in `*Normalized`/aliases, duplicate-id detection |
| `topothesies/geo.test.ts` | Topothesies hint math — `haversineKm` (known GR arcs), `bearingToArrow` (8 compass buckets), `proximityPct` (scaled 0–100, guards `maxKm<=0`) |
| `topothesies/selectDailyPuzzle.test.ts` | `selectDailyPuzzle` — deterministic uniform daily pick via `dateToIndex`, id-sorted (order-independent), throws on empty set |
| `topothesies/evaluateGuess.test.ts` | `resolveAnswerId` (accent-insensitive name/alias→id), `evaluateShapeGuess`/`evaluateCapitalGuess` (correct→no hint; wrong→distance/arrow/proximity; unknown→no hint) |
| `topothesies/scoring.test.ts` | `computeScore` — shape points + capital bonus scaling with guesses-left (gameRules knobs), failed-stage zero, independent-stage educational path |
| `topothesies/topothesiesReducer.test.ts` | State machine — shape→capital→finished transitions, 4/3 guess exhaustion, typo/unknown no-op, failed-shape still enters capital, finished inert, `RESTORE_STATE` replay |
| `topothesies/shareText.test.ts` | `buildShareText` — spoiler-free (no name/capital/id), accent-free, one square per guess with arrows, includes score |
