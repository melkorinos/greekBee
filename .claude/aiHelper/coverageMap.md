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
| `useScoreSubmission.test.ts` | Unified hook — submit/submitWithName (Leksokipos, Leksindeseis, Vres Tin Frasi): dedup guard, enabled gate, is_perfect latch. **+ Offline Mode (s132):** queues to the Offline Score Outbox instead of POSTing, keyed overwrite as the score climbs, name saves, disabled = queues nothing, and the **dedup boundary regression** — a score queued offline must still POST once online (`lastPostedRef` must NOT advance on the offline path) |
| `useLiveScorePost.test.ts` | Shared round-game posting policy — restored/untouched never posts (+never opens leaderboard), posts live score on every change, opens leaderboard once after delay on finish, custom delay |
| `useLeksiarxeioScoreSubmission.test.ts` | Leksiarxeio per-length posting — attempts→points mapping, deviceId gate, name ref |
| `useGuessRound.test.ts` | Shared guess-game spine — score-only-on-end, onGameEnd once, persist `{guesses,status}` + restore, save guard, per-puzzle sessions |
| `useSlotFillRound.test.ts` | Shared **slot-fill** spine (ADR 0019; topothesies/posokanei/logopaignio) — `hasLiveActed` false-on-fresh/flips-on-live/**false-after-restore**/flips-on-act-after-restore; snapshot persist+replay, derived flags replayed not persisted, give-up restore, hasProgress guard, **no re-write when only a non-persisted field changes**, per-session isolation |
| `communityPuzzleLifecycle.test.ts` | submit/list/review handlers **+ `consumeApprovedPuzzle`** (date-keyed read, **never deletes**, idempotent across calls, date-scoped so an archive date can't serve today's row, null on miss/error) **+ approve-time scheduling** (auto-assign earliest free future date, nulls ignored, assigned date echoed, admin override honoured, today/past/malformed override → 400, schedule-read failure → 500 without approving, Stavrolekso stays undated) |
| `communityPuzzleScheduling.test.ts` | The three data loaders as the page calls them (s134 regression) — each passes its **requested** date to the query rather than ignoring it; scheduled row served + stamped; **fall-through to the deterministic static rotation** when nothing is scheduled (expected value recomputed independently via `dateToIndex`); repeat calls for one date are stable; two dates differ |
| `apiRoute.test.ts` | The route envelope (ADR 0016), tested once instead of per route — `jsonError` code→status + detail logged-not-leaked, `jsonMessage` verbatim copy (incl. Greek at a chosen status), `parseJson` ok/invalid_json, `requireAdmin` header match, body-borne secret rejected, never fails open on unset `ADMIN_SECRET` |
| `leksokiposSync.test.ts` | `pushFoundWords` (wire shape, never throws) + `pullSnapshot` (rebuild snapshot+score, params, null on empty/null/error) — the cross-device sync wire |
| `useGameIdentity.test.ts` | SSR-safe DeviceId + DisplayName init, setter state updates |
| `usePlayerIdentity.test.ts` | Bundled identity module — migration-runs-before-device-read ordering, scalar fields from store, complete `leaderboardProps` bundle + wiring, `saveName` persists |
| `useGameStore.test.ts` | readSlice, writeSlice, clearSlice, deviceId, displayName, profileLinked, migration |
| `Shell.test.tsx` | Hamburger open/close/Escape, nav links, theme toggle, profile-button toggle (opens /profile; back-vs-home on /profile via `window.history.state.idx`). **+ Offline Mode (s132):** drawer toggle render/activate/deactivate + `aria-pressed`, activation prefetch, the pre-activation explanation copy, and the nav guard — confirms only for destinations **outside** the prefetched set, never game-to-game |
| `profileNav.test.ts` | `resolveProfileNav` — open /profile from elsewhere; back() on /profile with in-app history; "/" fallback with none |
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
| `phraseCorpusPlayable.test.ts` (vrestifrasi) | **Corpus↔pool contract** — drives the real reducer with the real assembled pool over EVERY phrase: correct answer must win, word lengths within `VRESTIFRASI.MIN/MAX_WORD_LENGTH`, pool covers every length used (incl. the authored 1-letter end), phrase word-counts within `MIN/MAX_PHRASE_WORDS`. Nothing else ties authored phrases to the fixed-length lists |
| `mobileLayout.test.tsx` | HowToPlayModal-specific overflow contracts only (list max-height/scroll, card clipping) — modal *shell* contracts live in `modal.test.tsx` |
| `modal.test.tsx` (shared) | Modal primitive — open/close gating, center/sheet variants, overlay-click + stopPropagation, close button, testid/aria pass-through (ADR 0009) |
| `recipes.test.ts` (shared) | Platform recipes — non-empty, button/leaderboard token contracts, no `dark:` pairs |
| `styles.test.ts` (leksokipos) | Leksokipos-local recipes — feedback/found-word/score-bar/give-up token contracts, no `dark:` pairs (ADR 0009) |
| `validateSubmission.test.ts` (×4: leksiarxeio, leksindeseis, vrestifrasi, stavrolekso) | Community Puzzle validation adapters as pure functions — per-game submission invariants; stavrolekso also `EDIT_PIN_PATTERN` + `validateStavroleksoData` (shared with PATCH edit route + maker) |
| `scoring.test.ts` (leksodromia) | `computeWordPoints` — decay-to-floor, hint costs, MIN clamp, perfect round = MAX_SCORE · `computeDecayFraction` — decay-bar fill (full/empty/clamp/linear) + base-independence regression (kills the perceived per-length speed-up) |
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
| `round.test.tsx` (leksoplegma) | `useLeksoplegmaRound` as REAL-reducer-through-REAL-persistence integration (ADR 0019 migration safety net) — round-trip restore (required/bonus/hints), status re-derived not persisted, wrongTrace transient/excluded, foundBonus `?? []` back-compat, filter-on-restore (stale saved words dropped vs current puzzle), hasLiveActed false-after-pure-restore/flips-on-act, hasProgress guard. Generic spine contract stays in `useSlotFillRound.test.ts`; filtering as reducer logic stays in `leksoplegmaReducer.test.ts` |
| `achievements.test.ts` (leksokipos) | Catalog + `detectEarnedAchievements` (word-length ladder = EXACT-length one-shots 10/11/12/13 + Θεριστής/Στην Κορυφή/Πρώτα Βήματα, daily gate) + `WORD_LENGTH_BADGES` (config lockstep, 10→Σιδηρόδρομος) + `detectEarnedPointsTiers`/`detectEarnedPangramTiers` + `nextPangramTierThreshold` + `describeAchievement` + operator-approved `glyph` map + display-badge resolution (`SELECTABLE_BADGE_IDS`, `qualifyingEarnedIds`, `resolveDisplayBadge`, `TIER_MEDALS`) |
| `profileBadgeRoute.test.ts` | `POST/GET /api/profile/badge` — earned-id validation (400 unknown/tier id, 403 unowned), lazy profile upsert, null clears |
| `leaderboardBadge.test.tsx` | `LeaderboardBadge` chip — glyph, medal only for tiered, distinct element after the name |
| `achievementToast.test.tsx` | AchievementToast render + dismiss |
| `useAchievementSync.test.ts` | The detection lanes — posting, points tier, pangram delta-post, unlock-toast surfacing (earned-at-mount suppression), gating |
| `useDayChange.test.ts` | Day-rollover redirect — today's puzzle, past-puzzle leaderboard nav, custom puzzles. **+ Offline Mode (s132):** `router.replace` suppressed while active (offline the force-dynamic page can't load, so the redirect would kill the round), `dayChangedWhileOffline` flag raised for the banner, normal redirect resumes once off |
| `useGameState.test.ts` | Cross-device server restore — gates, success, error handling, `restoreFromServer` |
| `missedWordsList.test.tsx` | MissedWordsList (give-up reveal) |
| `pangrams.test.ts` (leksokipos) | `sanitizePangramWords` shape guards (ADR 0013 B2) |
| `puzzle.test.ts` (leksokipos) | `isDailyPuzzle`, `isISODate` |
| `puzzleIndex.test.ts` | Slim puzzle index — drift guard vs full loader, `getPrebuiltPuzzleParams` canonical params |
| `randomPuzzle.test.ts` | `pickRandom7` quality rules |
| `rankDisplay.test.ts` | `rankProgress`, `getRankEmoji` |
| `answerPools.test.ts` (leksiarxeio) | `LEKSIARXEIO_ANSWER_POOLS` + `getSameDayFallbackAnswers` — seam == pool[dateToIndex] all year |
| `keyboardInteraction.test.tsx` (leksiarxeio) | On-screen keyboard letter/delete/enter dispatch end-to-end |
| `archiveNavigation.test.tsx` (×3: vrestifrasi, leksiarxeio, posokanei) | **Day-strip navigation guard (s134)** — the leaderboard's "play this puzzle" link swaps the puzzle prop without unmounting, so `useReducer`'s lazy initialiser never re-runs and the finished round leaks onto the new date. Every board that can switch Daily Puzzles is keyed at its render site (Guess family by `puzzle.id`; Slot-Fill + Leksodromia by `today`, their Session key). Each test asserts both halves: an unplayed archive date starts fresh after today's round is finished, and returning to a played date restores *that* date's Session. Keying by anything stable across dates (Leksiarxeio was keyed by Length) reintroduces the bug. Πόσο κάνει; covers the Slot-Fill spine for all five of its games |
| `NominationCard.test.tsx` / `page.test.tsx` (leksikastirio) | Card render, vote highlight, voting, admin controls; page rendering, tabs, optimistic voting |
| `matching.test.ts` (leksindeseis) | `matchesGroup`, `isOneAway` |
| `evaluatePhraseGuess.test.ts` / `letterState.test.ts` (vrestifrasi) | Two-pass cross-word evaluation (ADR 0004); `buildPhraseLetterStateMap` 4-state priority |
| `lib.test.ts` (stavrolekso) | `autoNumberSlots`, `isConnected`, `normalizeAndCompare`, `getSlotLength`, `getSlotCells` |
| `auth-link.test.ts` (api) + `authLinkRoute.test.ts` (shared) | `POST /api/auth/link` — JWT security boundary, link/restore modes, occupied-device guard, `identity_audit`, error paths |
| `applyDictionaryEdits.test.ts` + `resync{Registry,Leksiarxeio,Leksokipos,Leksoplegma,Leksodromia}.test.ts` (scripts) | ADR 0015 re-sync — orchestrator (dictionary + registry walk), write gate, per-game adapters: additions/removals/no-ops |
| `IdentityHeader` / `LifetimeStatsStrip` / `NameEditor` / `TrophyCase` / `WelcomeBackBanner` / `WordsByLengthCard` (profile) | The six Profile Page components |
| `words.test.ts` (leksokipos) / `wordsByLength.test.ts` / `wordsMerge.test.ts` | `sanitizeFoundWords` shape guards · `bucketWordsByLength` (sparse RPC rows → 10/11/12/"13+"; `WORDS_MIN_TRACKED`=10 floor) · `planWordsMerge` Restore union |
| `wordsRoute.test.ts` / `profileWordsRoute.test.ts` | `POST /api/words` (insert-if-absent, server-side `length`, **drops finds <10**) · `GET /api/profile/words` (RPC → buckets) |
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
| `postScore.test.ts` | `sanitizeDisplayName`; **`postScoreAwaitable`** (s132) — true on ok, false on non-ok/rejection/throw, JSON wire shape, never throws. The async sibling the outbox flush needs; `postScore` itself stays fire-and-forget and untested here beyond the name helper |
| `offlineOutbox.test.ts` | **Offline Score Outbox** (s132) — keyed overwrite by `(gameId, puzzleDate)` incl. the second-game regression, `outboxKey`, per-entry clear, corrupt-payload tolerance, `setOutboxDisplayName` across all entries, and `flushOutbox`: success clears, **failure KEEPS**, partial success, throwing post, empty no-op, and no-clobber of a score queued mid-flush |
| `useOfflineMode.test.tsx` | **Offline Mode** hook + provider (s132) — `OFFLINE_GAME_IDS` derivation (excludes wip + the server-backed community surfaces), activation prefetches every offline route, **the `prefetch`-returns-`void` regression** (it must never be treated as awaitable — awaiting it made activation report "ready" before anything cached), best-effort when prefetch throws, `beforeunload` registered only while active + cancels the event + removed on deactivate, flush on deactivate, keep-on-failure, **mount-time flush safety net**, shared state across consumers, the inert no-provider fallback. **The prefetch mock is deliberately void-returning** — mocking it as a promise is what hid the original bug |
| `e2e/offlineMode.spec.ts` | **Real-browser Offline Mode** (s132) — `context.setOffline(true)`, then navigating to another game. **`describe.skip`, failing ON PURPOSE**: it documents that `force-dynamic` routes do not survive a network cut, and is the acceptance test for whatever replaces route prefetching. Do not delete it or loosen its assertions to make it pass |
| `premadeDataConsistency.test.ts` | ADR 0015 drift guard — every game, both directions (stale removal + missed addition), byte-identical write path |
| `profileSectionFunnel.test.tsx` / `profileSectionSignIn.test.tsx` | ProfileSection — /profile funnel link; Google sign-in offered whenever not AuthLinked (ADR 0012) |
| `profileStatsRoute.test.ts` | `GET /api/profile/stats` |
| `puzzleDate.test.ts` | `todayISO` / `getLast7Dates` (UTC anchoring) / `normalizePuzzleDate` / `resolvePuzzleDateParam` / **`nextFreeScheduledDate`** (tomorrow on an empty calendar, never today, skips a booked run, fills a mid-run gap, order-independent, ignores past bookings, tolerates nulls, month + year boundaries) |
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
| `topothesies/evaluateGuess.test.ts` | `resolveAnswerId` (accent-insensitive name/alias→id), `evaluateShapeGuess` (correct→no hint; wrong→distance/arrow/proximity; unknown→no hint), `evaluateCapitalGuess` (s118: no distance hint — returns `{correct, known}`; unknown capital→not known, no-op) |
| `topothesies/scoring.test.ts` | `computeScore` — shape points + capital bonus scaling with guesses-left (gameRules knobs), failed-stage zero, independent-stage educational path |
| `topothesies/topothesiesReducer.test.ts` | State machine — shape→capital→finished transitions, 4/3 guess exhaustion, typo/unknown no-op, failed-shape still enters capital, finished inert, `RESTORE_STATE` replay, `GIVE_UP` (s118: `gaveUp` forces unsolved stages failed→finished, inert once finished, restored gave-up round) |
| `topothesies/shareText.test.ts` | `buildShareText` — spoiler-free (no name/capital/id), accent-free, shape squares carry arrows but capital line has none (s118), includes score |
| `topothesies/board.test.tsx` | `TopothesiesBoard` — silhouette render, wrong-shape hint chip, full play-through to scored result (score computed from config knobs), typo no-burn, capital wrong guess shows no distance hint (s118), give-up reveals unit+capital (s118), autocomplete row-pick fills-not-submits + «Μάντεψε» button commits (s123) |
| `topothesiesProject.test.ts` (scripts) | Topothesies build-time projector (`project.ts`) — `projectPoint`/`ringToPath`/`computeViewBox`/`ringArea`/`centroidLngLat`/`maxPairwiseCentroidKm`, worked examples; `pointInPolygon` (inside/outside/in-a-hole) and `polygonsBestFirst` (capital's polygon leads even when smaller — the Πόρος case, rest by area, area-only fallback when the capital is in none) (s135); `selectPeelPolygons` (polygon peel — capital's polygon alone at count 1; second pick is the largest **smaller** sibling, never the parent's own island and never a nearer rock; null when the capital is in no polygon or too few qualify) (s136) |
| `osmPolygons.test.ts` (scripts) | Topothesies OSM assembler (s119) — `assembleRings` (head-to-tail stitch, reversed segment, already-closed passthrough, open-ring no-loop), `signedRingArea` (CCW +, CW −), `assembleRelation` (hole-nesting, largest-first polygons, null on too-few points) |
| `posokanei/evaluateGuess.test.ts` | Πόσο κάνει; price scoring — `evaluatePriceGuess`: within-band correct (inclusive edge via +1e-9 float guard), higher/lower direction, proximity% (100 exact, 0 at/over PROXIMITY_MAX_REL, monotone decreasing) |
| `posokanei/selectDailyPuzzle.test.ts` | `selectDailyPuzzle` — exact `date` match wins; else `dateToIndex` rotation (stable, order-independent); single-row pool always returns it; throws on empty |
| `posokanei/scoring.test.ts` | `computeScore` — full points first-guess, −1 step per earlier wrong, zero unsolved, zero after give-up (gameRules knobs) |
| `posokanei/shareText.test.ts` | `buildShareText` — spoiler-free (no item/price digits in the guess row), 🟩 solve, ⬆️/⬇️ direction arrows, trailing `Σκορ:` line |
| `posokanei/posokaneiReducer.test.ts` | State machine — wrong guess stays guessing, band solve→finished, invalid/≤0/NaN no-op, MAX_GUESSES exhaustion→failed, finished inert, `GIVE_UP` forces failed, `RESTORE_STATE` replay |
| `posokanei/format.test.ts` | `formatEuro` — two decimals, Greek comma, trailing € (Intl-free) |
| `posokanei/board.test.tsx` | `PosokaneiBoard` — framed photo + item render, «πιο πάνω»/«πιο κάτω» direction hints, ≤0 no-burn, play-through to scored result with revealed price, give-up reveals price |
| `logopaignio/evaluateGuess.test.ts` | Λογοπαίγνιο brand matching — `evaluateGuess`/`normalizeAnswer`: exact/case/accent-insensitive, Greek⇄Latin via accept-list, all-whitespace-stripped, wrong rejected, empty→`{correct:false, normalizedInput:""}`, returns normalized input |
| `logopaignio/selectDailyPuzzle.test.ts` | `selectDailyPuzzle` — exact `date` match wins; else `dateToIndex` rotation over **id-sorted** pool (date optional; stable, order-independent); single undated row always returned; throws on empty |
| `logopaignio/scoring.test.ts` | `computeScore` — full points first-guess (per-reveal decay), −1 step per earlier wrong, zero unsolved, zero after give-up (gameRules knobs) |
| `logopaignio/shareText.test.ts` | `buildShareText` — spoiler-free (no brand/sector/input leak), fixed `MAX_GUESSES`-wide cell row (🟦 wrong / 🟩 solve / ⬜ unused), no digits in the row, trailing `Σκορ:` line |
| `logopaignio/logopaignioReducer.test.ts` | State machine — wrong guess stays guessing, accepted-spelling solve→finished, blank/whitespace no-op, MAX_GUESSES exhaustion→failed, finished inert, `GIVE_UP` forces failed, `RESTORE_STATE` replay (incl. given-up round) |
| `logopaignio/blur.test.ts` | `blurRadiusForReveal` — first (hardest) radius pre-guess, one ladder step per wrong guess, monotone non-increasing, clamps past-end/negative, 0 once revealed (gameRules `BLUR_STEP_RADII_PX`) |
| `logopaignio/board.test.tsx` | `LogopaignioBoard` — framed mark + sector render, blur steps down after a wrong guess, wrong-guess history row (no finish), blank/whitespace no-burn, play-through to scored result with revealed brand (Latin accept spelling), give-up reveals brand + 0 πόντοι |
