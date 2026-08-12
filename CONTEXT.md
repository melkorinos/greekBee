# Greek Word Games Platform

A browser-based platform hosting multiple daily Greek word games. Each game is isolated in logic and persistence but shares a common shell, navigation, and device identity.

---

## Glossary

**Platform** — The entire application: shell, navigation, persistence, and all games. Named **Leksarxeia** (the brand shown in the Shell header and picker). (Not: app, site)

**Game** — A distinct game mode. Live: Leksokipos, Leksiarxeio, Vres Tin Frasi, Stavrolekso, Leksodromia, Leksoplegma, Topothesies (plus the Leksikastirio word-court, which is not a Game). Hidden: Leksindeseis, Πόσο κάνει;, Λογοπαίγνιο. The platform's scope widened from "Greek word games" to "Greek **games**" with Topothesies (ADR 0018). (Not: app mode, level)

**Hidden** *(of a Game)* — Listed on no player-facing surface: absent from the picker and the shell drawer. Its **route stays live** — it loads and plays for anyone holding the link, in every environment, with no redirect and no 404. `hidden: true` in `src/config/games.ts`, and **orthogonal to `wip`**: `wip` says the Game is unfinished, `hidden` says it is deliberately not shown, finished or not. Leksindeseis is both and is genuinely finished. See ADR 0022. (Not: disabled, unpublished, wip)

**Regional unit** *(Topothesies)* — Greek περιφερειακή ενότητα; the admin level a Topothesies answer identifies. Island-cluster units are split into per-island entries; see ADR 0018. (Not: prefecture, νομός — retired admin level.)

**Silhouette** *(Topothesies)* — The precomputed SVG outline of an answer shown as the Stage-1 prompt. Rendered from a static `path` string + self-framing `viewBox`, never a client-side projection (ADR 0018). (Not: shape, map.)

**Island entry / split** *(Topothesies)* — A Topothesies answer is a place that is *either* a regional unit *or* a single recognizable island peeled off one. Both kinds carry a silhouette and a capital stage — an island with no capital cannot be an answer, which is why Δήλος is not one. (Not: prefecture.)

**Peel** *(Topothesies)* — Taking an island out of the larger unit it administratively belongs to, so it becomes its own answer. Two kinds: an **attribute peel** (`ISLAND_PEEL_WD`) claims a whole δήμος by its Wikidata QID, and a **polygon peel** (`POLYGON_PEELS`) selects one island out of a δήμος that spans several and removes it from the parent. Nothing is ever *split*: a multi-island δήμος already arrives as one polygon per island. (Not: split, merge.)

**Capital stage** *(Topothesies)* — Stage 2: after the unit is guessed (or its guesses exhausted), the player guesses its capital/chief town for bonus points. Every entry keeps the capital stage. (Not: bonus round.)


**Session** — One continuous play of a Puzzle on a given device. Persists across refreshes until the Puzzle changes. Each game persists different fields (Leksokipos: score + found words; Leksiarxeio: guesses per length; Leksindeseis: solved groups + mistakes; Vres Tin Frasi: guesses + status; Stavrolekso: typed cells + solved slots per puzzle ID). Leksokipos daily Sessions are also synced to the server (see `game_state` table) for cross-device restore via TransferCode.

**Round Spine** — The shared hook that owns a game family's reducer → persistence wiring, so member games keep only what genuinely differs. Two exist, one per family, and they are deliberate siblings rather than one generic spine (ADR 0019). (Not: base hook, game engine)

**Guess Family** — The Wordle-shaped games: **Leksiarxeio**, **Vres Tin Frasi**. A fixed number of attempts at a secret Answer, a `status` of `playing`/`won`/`lost`, and a Score that is a pure function of `(attempts, won)` computed once the round ends. Spine: `useGuessRound`. (Not: wordle games)

**Slot-Fill Family** — The Worldle-shaped games: **Topothesies**, **Πόσο κάνει;**, **Λογοπαίγνιο**. The player fills a slot (a Regional unit, a price, a brand) from a visual prompt; every stage flag is *derived* from the guess history; giving up is an explicit end-state; the Score decays with each wrong guess and is posted continuously while the round is live. Spine: `useSlotFillRound`. Λεξόπλεγμα shares the shape but still runs its own copy; Λεξοδρομία is **not** a member (it owns a decay clock and a restore that must interleave with it) — see ADR 0019. (Not: worldle games, daily-photo games)

**Live Action** *(Slot-Fill Family)* — A Guess or give-up the player makes **this** Session, as opposed to a round replayed from storage on mount. The Round Spine tracks it (`hasLiveActed`) by issuing its own `RESTORE_STATE` through a raw dispatch that never flips the flag; `useLiveScorePost` reads it so a restored-but-untouched round never re-posts its Score. (Not: interaction, touch)

**DeviceId** — Stable anonymous UUID generated once per browser, shared across all games. Not permanently unique per browser: a browser *adopts* another's DeviceId on TransferCode claim or Sign-in Restore, so one DeviceId can identify all of a player's browsers. Treated as a **secret credential** — knowing it authorises score posts and profile access, so it must never appear in public URLs, links, or payloads visible to other players. (Not: userId, playerId)

**DisplayName** — Player-chosen name shown on leaderboards. Optional. (Not: username)

**Guess** — A player's submitted attempt: one word in Leksiarxeio, four words in Leksindeseis, one full phrase in Vres Tin Frasi. (Not: attempt, submission)

**Leaderboard** — Ranked Scores for a specific Daily Puzzle, 7-day rolling window. Only Daily Puzzles have one. (Not: rankings)

**Puzzle** — A single playable instance of a Game on a given date. Types: `LeksokiposPuzzle`, `LeksiarxeioPuzzle`, `LeksindeseisPuzzle`, `VresTinFrasiPuzzle`, `LeksoplegmaPuzzle`, `PosokaneiPuzzle`, `LogopaignioPuzzle`. Topothesies has no `…Puzzle` type — its daily round is a `TopothesiesAnswer` plus its `TopothesiesShape`. Leksodromia has no stored puzzle type — its daily round is derived deterministically from the Leksiarxeio Word Pools. (Not: board, level)

**Daily Puzzle** — A Puzzle shared by all players on a given day (date-scoped ID).

**Pre-built Puzzle** *(Leksokipos)* — Batch-generated, quality-filtered, stored in `puzzles-el.json`. Every Daily Leksokipos Puzzle is Pre-built. (Not: curated)

**Community Puzzle** — A Puzzle submitted by a player, admin-approved, and **scheduled** as the Daily Puzzle for a specific future date. Primary source for Leksiarxeio, Leksindeseis and Vres Tin Frasi; static pools are the fallback for any date with nothing scheduled. Carries optional `submitter_name` shown during play. Serving is a non-destructive read, so every player on that date gets the same puzzle no matter how often the page reloads. (Not: curated puzzle — retired)

**Scheduled Date** — The calendar date a Community Puzzle is released on (`scheduled_date`, nullable date, migration `20260805120000`). Assigned at approval: the earliest free date **strictly after today**, unless the admin names a future date in the review PATCH. A `pending` row has none. One puzzle per date per game, enforced by a partial unique index. Past dates are never scheduled, so they always serve the static rotation — already-consumed puzzles from before this feature are unrecoverable and are not replayed. (Not: `created_at`, puzzle date/id)

**Community Puzzle Lifecycle** — The shared state machine for every Community Puzzle: submit → `pending` → approve (UPDATE status **+ assign a Scheduled Date**) or reject (DELETE row) → **serve** (read the approved row scheduled for the date a game is rendering; the row is left in place). One module (`src/lib/communityPuzzleLifecycle.ts`) owns all four transitions: auth, parsing, insert, list, and review back the `/api/community-puzzles/*` routes; `consumeApprovedPuzzle(table, date)` backs the three game data loaders (Leksiarxeio, Vres Tin Frasi, Leksindeseis), which are thin mappers from the served row to their own Puzzle shape plus a static fallback. `ScheduledPuzzleTable` excludes Stavrolekso from every schedule-aware path at the type level, so approval there stays a plain undated status flip. Per-game variation (table, validation adapter, list shape, public approved list) enters as config declared in each game's route file; the validation adapter itself is a pure function in the game's lib (`src/games/<game>/lib/validateSubmission.ts`), imported only by that game's route so word-pool imports stay out of the other edge bundles. Stavrolekso's adapter is additionally shared by the creator-edit route (PATCH) and the maker's pre-flight checks, so an edit can never regress a puzzle below the submission invariants. Stavrolekso never consumes — its rows persist after approval. (Not: submission flow, community puzzle API)

**Custom Puzzle** *(Leksokipos only)* — Player-constructed from a 7-letter combination. ID: `custom-{center}-{sortedOuter}`. Never on the Leaderboard.

**Puzzle ID** — `YYYY-MM-DD-{language}` for Leksokipos Daily; `YYYY-MM-DD-wordle-{length}` for Leksiarxeio (frozen — renaming wipes localStorage sessions); `custom-{center}-{sortedOuter}` for Custom; `YYYY-MM-DD-vresi` for Vres Tin Frasi; plain `YYYY-MM-DD` for Leksodromia and Leksoplegma (the date **is** the daily puzzle id — Leksoplegma's generator ids are internal to the batch and never persisted). Leksindeseis has no `id` field — `date` is the effective ID.

**Normalised Word** *(Leksokipos)* — Lowercased, accent-stripped, final ς → σ via `normalizeLetters()`. All stored words are normalised; raw input is normalised on arrival. (Not: cleaned, sanitised)

**Center Letter** — The mandatory letter every Leksokipos word must contain.

**Outer Letters** — The six non-mandatory letters in a Leksokipos Puzzle.

**Valid Words** *(Leksokipos)* — All words accepted by a Puzzle. Pre-computed for Pre-built Puzzles; computed on-demand for Custom. (Not: answers, word list)

**Pangram** — A Leksokipos word using all 7 puzzle letters. +7 pt bonus. Every Pre-built Puzzle has ≥1.

**Score** *(Leksokipos)* — Accumulated points: 4-letter words = 1 pt; 5+ = 1 pt/letter; Pangram +7 pt bonus.

**Max Score** *(Leksokipos)* — Sum of all Valid Word scores, scaled by `SCORE_SCALE` (0.75 since the 2026-07-30 rebalance), then passed through a soft cap: unchanged below the knee (`SOFT_CAP_KNEE`), logarithmically compressed above it (`SOFT_CAP_K`) so the value keeps rising with a puzzle's richness instead of pinning to one number — no hard ceiling. Used for Rank thresholds and as the Endgame Zone trigger.

**Endgame Zone** *(Leksokipos)* — Scoring range entered when `score ≥ maxScore` (daily puzzles only). The rank-ladder popup is replaced by an endgame panel showing: total Valid Words remaining, pangrams remaining, and a count per word length (longest first). No hints are given.

**Full completion** *(Leksokipos)* — Local end-state reached when 0 Valid Words remain (player has found every word). "ΤΟ ΠΕΘΑΝΕΣ" is displayed in the word-feedback area and the board locks (letter input disabled). Purely a game mechanic — no reward. *(This was **formerly** what Τζιμάνι meant — a secret rank + one-shot achievement + 🏛️ Leaderboard glyph. The perfect-round concept was **removed 2026-07-18** across achievement, stat cell, glyph, and score wire — ADR 0013 amendment. Full completion earns nothing; see the current **Τζιμάνι** entry below, which is a different thing under the same word.)*

**Τζιμάνι** *(Leksokipos)* — **Finding 70% of a Daily Puzzle's Valid Words** (`achievementTuning.tzimaniFoundRatio`). Two readers share the one meaning: a `kind='tzimani'` row in `player_milestones` records each qualifying **day** (carrying the achieved percentage in `value`), and the tiered **Τζιμάνι Badge** ladders on the lifetime count of those days at 1 / 5 / 10. **This is NOT the retired perfect round** (see Full completion above) — the ladder counts days at 70%, and no rung climbs the percentage, because a 100% rung would be that retired concept under a new name. The `leksokipos-tzimani` id was revived for it on 2026-08-07, replacing **Θεριστής** (`leksokipos-theristis`, retired permanently), which measured the same thing at 80% as a one-shot. Both id moves are frozen-id exceptions licensed only by the pre-launch reset — ADR 0013's 2026-08-07 amendment. (Not: perfect round, full completion)

**Rank** — Score milestone: Ψαράκι → Έτσι κιέτσι → Οκέι → Για πάμε → Θηρίο → Φωτιά → Γκουρού → Απολυτότητα. (Not: level, tier)

**Found Words** — Ordered list of Valid Words submitted in the current Session.

**Theme** — Platform-wide light/dark mode. Toggle in Shell header. Persisted in `localStorage["theme-preference"]`. Applied via `.dark` class on `<html>`. Does not follow OS preference.

**Grid Variant** — Leksokipos display style: **Pie Slice** or **Flower**. Persisted in `localStorage["leksokipos-variant"]`. No effect on puzzle data or scoring.

**Word Pool** *(Leksiarxeio)* — Full normalised word list per Length (`words-4.json` … `words-8.json`). Drives both Answer selection and Guess validation.

**Answer** *(Leksiarxeio)* — The secret word. Selected deterministically by date from the Word Pool, or from a Community Puzzle row. (Not: solution)

**Tile** — One letter cell in the Leksiarxeio grid. States: `correct`, `present`, `absent`, `empty`, `pending`.

**Length** *(Leksiarxeio)* — Letters in the Answer. Supported: 4–8. Each Length is a separate Puzzle with its own Session.

**In-game Points** *(Leksiarxeio)* — Per-length score from `scoreLeksiarxeio()`: 6 pts (1 guess) … 1 pt (6 guesses). Stored per Length in `game_scores` (`word_length` column). Summed for the Leaderboard Score.

**Leaderboard Score** *(Leksiarxeio)* — Sum of In-game Points across all 5 Lengths for a given date. Higher is better. Failed/unplayed length = 0 pts. API field named `score`. Display label: "Σκορ".

**Phrase** *(Vres Tin Frasi)* — The daily answer: a 2–9 word Greek saying or common expression (`MIN/MAX_PHRASE_WORDS`; five words is the norm and the classic proverbs reach nine). Each word is 1–8 letters (`MIN/MAX_WORD_LENGTH` — 1 is the standalone articles «η»/«ο», 8 is a deliberate ceiling the corpus is authored to fit). The phrase must have cultural/linguistic coherence — not random words. Stored as display form (accented, natural case); normalised at runtime for evaluation. (Not: sentence, expression)

**Phrase Pool** *(Vres Tin Frasi)* — Source of daily Phrases. Community-approved phrases take priority; static JSON of ~500 pre-computed Greek phrases is the fallback. Stored in `community_vrestifrasi_puzzles` (community) and `phrases-el.json` (static).

**Phrase Guess** *(Vres Tin Frasi)* — A player's submitted attempt: a sequence of words exactly matching the answer Phrase's word count and each word's length. Each word must exist in the word pool (2–8 letters). (Not: attempt)

**Phrase Tile** *(Vres Tin Frasi)* — One letter cell in the Vres Tin Frasi grid. States: `correct` (green), `present` (yellow), `misplaced-word` (purple), `absent` (grey), `empty`, `pending`.

**Misplaced-Word** *(Vres Tin Frasi)* — Tile state (purple): the guessed letter appears in the answer Phrase but in a different word than the one it was guessed in. Evaluated after greens are resolved: remaining answer letters form a cross-phrase pool; a letter not in its own word's pool but present in another word's pool → misplaced-word. Keyboard priority: `correct` > `present` > `misplaced-word` > `absent`. (Not: present — that is yellow, wrong position within the same word)

**Score** *(Vres Tin Frasi leaderboard)* — Points from `scoreVresTinFrasi`: 6 pts for a 1-guess win → 1 pt for a 6-guess win; a loss is 0. **Higher is better** (same scale as Leksiarxeio In-game Points), sorted descending like every other board (ADR 0014). Stored in `game_scores` with `game_id = "vrestifrasi"`; API field named `score`. The player still sees their raw attempt count in-game; only the leaderboard currency is points. (Converted from the retired lower-is-better *Attempt Count* — ADR 0014. Not: attempt count, προσπάθειες)

**Category** *(Leksindeseis)* — Label naming a Group of 4 words. Hidden until the Group is solved. (Not: theme, topic)

**Group** *(Leksindeseis)* — Exactly 4 words sharing a Category. A Puzzle has 4 Groups. (Not: category — use only for the label)

**Difficulty** *(Leksindeseis)* — Integer 1–4. 1 = easiest (yellow), 4 = hardest (purple). Display only.

**Selection** *(Leksindeseis)* — Up to 4 highlighted words before a Guess is submitted. Cleared after each Guess.

**Mistakes Remaining** — Wrong Guesses left before game over. Starts at 4.

**Profile** — Named identity linking a DisplayName to a DeviceId in `player_profiles`. Shared across games. (Not: account, login)

**ProfileLinked** — Boolean in PersistenceEnvelope: true when this device has a Profile row. (Not: logged in)

**AuthLinked** — Boolean: true when this device's Profile has an associated Google account (`auth_user_id` set on its `player_profiles` row). `AuthLinked` always implies `ProfileLinked`. The auth account is the durable identity anchor; a device is one session of it (ADR 0012). (Not: logged in — use AuthLinked)

**Sign-in Restore** — Signing in with Google on a device whose account already has a linked Profile: the device adopts that Profile's DeviceId (same mechanic as TransferCode claim), then any pre-existing local history is merged — best Score per Puzzle wins, the account Profile's DisplayName wins, and the device's old Profile row is deleted. The player lands on the Profile Page with a welcome-back message showing what came back. **Exception — occupied device** (ADR 0012 amendment, issue 01): if the current device's Profile row is already AuthLinked to a *different* account (a shared browser someone forgot to Disconnect), the merge/delete is skipped — the caller adopts their own canonical identity (or is minted a fresh DeviceId if they have none) and the resident owner's row is left untouched. (Not: account recovery, login sync)

**TransferCode** — 6-char alphanumeric code (no I/1/O/0) for cross-device identity migration. 24h TTL, single-use. Retained indefinitely as the no-account fallback; its claim-adoption mechanic is also the foundation of Sign-in Restore.

**Achievement** — A permanent award earned once per player for reaching a game or platform milestone. Earned anonymously (keyed by DeviceId), durable once AuthLinked, losable before. Earned means earned forever — never revoked by later score changes, merges, or rule changes. **Every catalog entry is tiered** since the 2026-08-07 rebuild (Χάλκινο → Ασημένιο → Χρυσό, plus Μακρυλέξης' fourth Διαμάντι rung) — there are five: Στην Κορυφή, Μακρυλέξης, Τζιμάνι, Κυνηγός Πανγκράμ, Συλλέκτης Πόντων. The underlying *earned facts* may still be one-shot (Μακρυλέξης' four rungs are exact word lengths, not a running count). (Not: badge — that's its visual token)

**Badge** — The visual token of an Achievement: a full tile in the Trophy Case, or the player's selected Display Badge on Leaderboard rows. Every catalog entry has an emoji `glyph` (interim art; icons later). (Not: achievement — that's the earnable condition)

**Display Badge** — The ONE earned Achievement a player opts to show beside their name on every Game's Leaderboard: a distinct chip after the plain name — glyph plus, for tiered Achievements, the **highest earned tier's** medal (🥉🥈🥇), resolved at read time so it auto-upgrades. Picked (and cleared, by tapping again) in the Trophy Case; stored as the base achievement id in `player_profiles.selected_badge_id`; `POST /api/profile/badge` verifies the Achievement is genuinely earned. Default is none — opt-in. **Exactly one, permanently** — displaying several Badges with precedence rules is a closed question, not a deferred one (ADR 0013 amendment 2026-08-06). (ADR 0013 amendment 2026-07-18.) (Not: title, flair, part of the DisplayName)

**Profile Page** — The standalone surface where a player views their own identity state (anonymous / ProfileLinked / AuthLinked), edits their DisplayName, sees Lifetime Stats and the Words by Length card, and browses their Trophy Case. Also where Sign-in Restore lands the player to show what came back. v1 shows only the viewer's own profile — viewing other players' profiles is deferred until a public identifier exists (DeviceId is secret). (Not: account page, settings page)

**Trophy Case** — The full Achievement display on the Profile Page: every catalog entry rendered, earned Badges lit, locked ones greyed with their unlock hint. Sits with Words by Length inside one labelled **Leksokipos section** — structural scoping, so "Badges are Leksokipos-only" needs no caveat line. **Not tabs**: tabs advertise a sibling to switch to, and exactly one Game earns Badges; a second earning Game is what would justify them. (Not: badge list, achievements tab)

**Words by Length** (Λέξεις ανά μήκος) — A Profile Page card showing how many long words the player has ever found, broken down by word length: lengths 10, 11, 12 individually plus a "13+" tail, each a small horizontal bar, over a total. Only words of 10+ letters are tracked at all — a word that long is itself a one-shot Achievement (Σιδηρόδρομος = 10, plus the 11/12/13 badges). The client filters to that floor before posting and `/api/milestones` enforces it as the authoritative backstop (the floor is `WORDS_MIN_TRACKED`, derived from `achievementTuning.wordLengthBadges`). Fed by the `kind='word'` rows of the append-only `player_milestones` set (one row per valid ≥10 find per `puzzle_date`, its length in `value`), aggregated in Postgres by the `player_milestones_by_length` RPC — the read never fetches rows (`GET /api/profile/words` → `bucketWordsByLength`). Leksokipos-only in v1 (the only Game with free-form found words); a cross-Game extension needs a `game_id` column **inside** the UNIQUE, not beside it. **No backfill exists** — finds before capture shipped were never stored, and the 2026-08-07 absorption deliberately did not copy the beta rows — so everyone starts at zero and the empty state never implies lost history. Display-only (no Badge; those are parked). Rides `FEATURE_FLAGS.achievements`. (Not: word count, vocabulary stats)

**Lifetime Stats** — Per-player aggregates over full `game_scores` history (append-forever makes them safe): total points, puzzles played, and pangram count (from the `kind='pangram'` rows of `player_milestones`, not `game_scores`; the same one GROUP BY also returns the `top_rank` and `tzimani` day counts, which the tiered Στην Κορυφή and Τζιμάνι Badges read for both their live progress and their mount self-heal). *(A Τζιμάνι count cell was removed 2026-07-18 with the perfect-round concept — ADR 0013 amendment. The Βάθρο podium cell and its cross-device query were removed 2026-08-06 when tiered podium badges were rejected — podium slots are fixed at three while the audience grows, so the metric gets strictly harder over time.)* Streak is defined below but not yet surfaced in the strip. Keyed by DeviceId — never `auth_user_id` (Sign-in Restore makes the adopted DeviceId canonical, so one key serves anonymous and AuthLinked players alike); Daily Puzzles only (Custom Puzzles never post scores). (Not: statistics, records — records are all-time bests, a parked pillar)

**Streak** — Consecutive calendar days on which a player scored at least one Daily Puzzle in any Game (platform-wide, not per-Game). Derived from distinct `puzzle_date`s in `game_scores`; Custom Puzzles excluded. Current and Best Streak show in Lifetime Stats. (Not: per-game streak)

**Disconnect** — Ending a device's identity: the device gets a fresh DeviceId and cleared local state, becoming a brand-new anonymous player. Both profile disconnect and Google sign-out mean this — "this device is no longer this person." Nothing server-side is deleted; signing back in (or claiming a TransferCode) restores everything. (Not: logout, unlink)

**Admin Restore** — Break-glass recovery when a player loses their identity: admin looks up email → `auth_user_id` → DeviceId in the DB and issues a TransferCode for it via SQL (see `docs/admin-restore.md`). The player claims the code normally. (Not: account recovery — that's the player-facing Sign-in Restore)

**Leksikastirio** — Community word-court (λεξικό + δικαστήριο). Players vote on Nominations; admins triage them. Also hosts Community Puzzle review tabs in Admin Mode. (Not: word review, suggestions page)

**Nomination** — Proposal to add or remove a word from `words-el.json`. Has a Direction, DeviceId, status, and a **mandatory** submitter name and explanation (2026-08-07; both were optional before, and the explanation was demanded only when re-proposing a rejected word). The two minimums live in `src/lib/nominationDecision.ts` and are enforced by `guardSubmit` in the modal *and* by `POST /api/nominations` — a short explanation is refused because a one-word note tells a reviewer no more than an empty one. Word-level refusals (blocklisted, already accepted, already pending) are decided *before* the fields, on both sides. (Not: suggestion, report)

**Direction** — `"add"` or `"remove"` intent of a Nomination.

**Nomination Status** — `"pending"` → `"accepted"` or `"rejected"`.

**Vote** — Player endorsement of a Nomination, stored as `(nomination_id, device_id)`.

**Admin Mode** — `?admin=<secret>` URL param matching `ADMIN_SECRET`. Reveals Approve/Reject on Nomination Cards and Community Puzzle review tabs. Not linked from nav. On the wire the secret always travels as an `X-Admin-Secret` header and a bad one is always a 401 — one shape across every admin route, enforced by `requireAdmin` in the **Route Envelope** (ADR 0016).

**Route Envelope** — The three things every `/api` route does before its own logic, owned once in `src/lib/apiRoute.ts`: `parseJson` (body + the 400 guard), `requireAdmin` (the admin gate), and the error body. Error bodies stay `{ error: string }` but split into two deliberate channels: `jsonError(code)` for stable codes the envelope owns (`invalid_json`, `unauthorized`, `not_found`, `db_error`) — implementation detail is logged, never sent — and `jsonMessage(text, status)` for copy the route authors on purpose, including the Greek strings the UI renders verbatim. Choosing between them is the discipline: if you can't name the code, you're probably about to leak something. (ADR 0016)

**Flag** — In-game Leksokipos action that opens NominationModal with `direction: "remove"`.

**Feedback** — A player-submitted message to the maintainer, delivered by email (via FormSubmit). Not persisted server-side, not moderated, and carries no lifecycle. Distinct from a **Nomination** (a word proposal, DB-backed, voted on, admin-triaged) and from the Leksokipos removal-`reports` slice (client-only dedup list). One global entry point in the Shell; auto-attaches the DeviceId, and **nothing else** — the current URL and user-agent were dropped 2026-08-12, because FormSubmit is the Platform's only third-party processor and the Privacy Page states by name that exactly two fields leave the browser. The DeviceId stays for a reason beyond debugging: an erasure request sent this way arrives already carrying the key needed to action it. MVP is free text only; an optional user-uploaded screenshot is deferred (the free email relays don't attach files). (Not: bug report, report, suggestion, nomination)

**Privacy Page** — The Platform's only legal surface: `/privacy`, in Greek, plain-voiced. Deliberately unadvertised — one link in the drawer's Βοήθεια section, no footer, no banner, no consent dialog — a posture that holds only while there is no analytics and no advertising cookie. Every sentence on it is a public claim about the code, so storage, hosting or third-party changes must revisit it in the same change; `privacyPage.test.tsx` pins the production dependency list for exactly that reason. There is deliberately **no Terms of Service** (no payments, no lockable accounts, no user-to-user messaging). (Not: terms, cookie policy, consent)

**Stavrolekso** — Community crossword game (σταυρόλεξο). Crosswords are community-submitted, admin-approved, and never deleted — players browse the full approved pool. Not auto-generated. (Not: crossword)

**Stavrolekso Puzzle** — A single crossword: a grid with black squares, numbered cells, and a clue per slot (Across + Down). Optional title. Grid is always square; supported sizes: 9×9, 13×13, 15×15. Lifecycle: `pending` → `approved` (permanent) or deleted on rejection. Unlike other Community Puzzles, rows are never consumed. Stored as slot-based JSONB: `{ width, height, blackSquares: [row,col][], slots: [{ number, direction, startRow, startCol, answer, clue }][] }`. Validated against `words-el.json` (soft warning on unknown words).

**Edit PIN** — Creator-chosen alphanumeric code (4–8 chars) set at Stavrolekso Puzzle submission. Stored plain on the row. Combined with the puzzle's unique ID to authenticate edit access. Only valid while the puzzle is `pending`. (Not: edit token, edit code)

**Slot** — A contiguous horizontal or vertical run of white cells in a Stavrolekso grid, bounded by black squares or the grid edge. Each Slot has a direction (Οριζόντια/Κάθετα), an auto-assigned number, and one plain-text clue (letter count appended by the UI). Minimum length: 3. (Not: word, entry)

**Οριζόντια** — Across direction in a Stavrolekso Puzzle. (Not: horizontal, across)

**Κάθετα** — Down direction in a Stavrolekso Puzzle. (Not: vertical, down)

**Leksodromia** — Daily anagram sprint (λεξοδρομία — UI renamed to greeklish 2026-07-14): 10 words (2 per Length 4–8, ascending), each shown as a Scramble to unscramble as fast as possible. Points decay with time (Decay Scoring); no stored puzzle — words are selected deterministically by date from the Leksiarxeio Word Pools, never colliding with Leksiarxeio's same-day Answer. (Not: anagram game, speed round)

**Scramble** *(Leksodromia)* — The deterministic shuffled form of an answer word, shown as a tile rack. Multiset-preserving and never identical to the answer. (Not: shuffle, rack — the rack is its visual layout)

**Decay Scoring** *(Leksodromia)* — Per-word points start at a base for its Length and decay linearly to a floor (25% of base) over 45 s of active solve time (the clock pauses while the tab is hidden). Each Hint costs 30% of base (max 2 per word); a solved word always scores at least 5 pts, so solving always beats a Skip. Perfect round = 1000. (Not: timer scoring, countdown)

**Skip** *(Leksodromia)* — Passing on the current word via the two-phase «Επόμενο» button. The FIRST skip requeues the word at the end of the run as a Second Chance; only a second skip is final (0 points, into the recap). (Not: pass, give up)

**Second Chance** *(Leksodromia)* — A requeued skipped word coming around again after the first pass. Its decay clock and hint count RESUME from where they were at the skip — never reset, so skipping cannot be used to peek at a word and return to it fresh. Skipping a Second Chance is final. (Not: retry from scratch, redo)

**Hint** *(Leksodromia)* — Reveals the next correct letter as a locked prefix of the answer row. Costs 30% of the word's base points; max 2 per word. **Engine-only at launch**: the reducer and scoring support it but no button exposes it in the UI. (Not: Leksoplegma's Hint — different mechanic and cost)

**Leksoplegma** — Daily word-web (λεξόπλεγμα — UI renamed to greeklish 2026-07-14; 16-tile 4×4 grid): every Required Word lies along an authored path of edges; the player finds words by tracing them. Any Extra Word traced on the web also scores. No timer — points only. Daily Puzzle = date rotation over a committed generator batch, advanced past any puzzle whose Required Words contain Leksiarxeio's same-day Answer. (Not: word search, boggle)

**Trace** *(Leksoplegma)* — An ordered tile sequence built by dragging or tapping along the web's edges (dim or bright alike). A Trace matches a word in either direction (forward or reversed). (Not: path — a Path is the authored answer route)

**Required Word** *(Leksoplegma)* — One of the ~9 authored words of a puzzle, each with its authored Path. Finding all Required Words ends the round. Scores length × 10 pts. (Not: answer, target)

**Collapse** *(Leksoplegma)* — Soft: when a Required Word is found, tiles and edges no longer needed by the remaining unfound Required Words **dim** but stay traceable until the round ends — bright parts still hide a Required Word, dim parts are cleared. Nothing ever leaves the board, so Extra Words are never lost mid-round. Derived state, not a timer. (Not: removal, disappearance — that was the pre-launch hard collapse, reworked 2026-07-14)

**Hint** *(Leksoplegma)* — Reveals a Required Word's start tile and length. Costs 25 pts (score floor 0); max 1 per word. **Engine-only at launch**: the reducer and scoring support it but no button exposes it in the UI. *(The perfect-round `is_perfect` wire this game posted was removed 2026-07-18 — ADR 0013 amendment.)* (Not: Leksodromia's Hint)

**Extra Word** *(Leksoplegma)* — Any valid dictionary word (≥3 letters) traceable along the web that is not a Required Word — exhaustively precomputed per puzzle by the generator. Scores flat points, all round long (soft Collapse); never gates completion and never triggers Collapse. Never auto-submits — many Extra Words are prefixes of Required Words — so it is submitted explicitly (✓ button or drag release). UI: «Έξτρα λέξεις»; code: `bonusWords`. Briefly removed and reinstated on 2026-07-14 — the rejection of real Greek words felt wrong to players. (Not: bonus mechanic, hidden word)

**Offline Mode** — A deliberate, platform-wide client-side state, toggled from the Shell drawer, that protects **the round the player is currently in** when the network drops. Activated **while still online**; it blocks browser refresh (`beforeunload`), confirms before **every** in-app navigation, and holds the score in the Offline Score Outbox until manual deactivation flushes it. **Single-page only — switching games offline does not work** and the UI says so: every game page is `force-dynamic`, so its payload is not served from cache and a navigation offline hits the browser's connection-error page. Route prefetching does not change this (proven 2026-08-03, `e2e/offlineMode.spec.ts`); delivering the originally-designed multi-game offline play needs a service worker, which reopens ADR 0010. *(Renamed from **Offline Lock**, the superseded Leksokipos-only toggle.)* (Not: airplane mode, PWA, service worker, cold start, cross-game offline play)

**Cue** — A named sound-worthy moment, and the short sound it plays. Named for **the moment, not the noise** (`pangram`, `wordFound`, `missingCenter`), so replacing the rooster is a file swap rather than a rename. Three exist, all Leksokipos, all chosen by one pure `selectSoundCue` over the submission's `ValidationResult` — a Pangram plays the rooster **only**, and four of the five rejections are deliberately silent. **Off by default**, toggled 🔊/🔇 in the Shell header beside the theme toggle and stored standalone under `localStorage["sound-preference"]`, outside the state envelope. Deliberately **not** a `GameCapability` (ADR 0020's criterion is what a Game does to the shared database, and a Cue writes nothing). Registry, per-Cue volume and file provenance live in `src/config/sound.ts`; the licence bar is CC0 or the Pixabay Content License, never CC-BY. See ADR 0021. (Not: sound effect, notification, chime)

**Offline Score Outbox** — A localStorage record (`wordgames:offline-outbox`) holding pending Scores earned during Offline Mode, **keyed by `(gameId, puzzleDate)`** and overwriting per key: `{ gameId, puzzleDate, deviceId, score, displayName }`. Not an append queue — `game_scores` upserts by `(device_id, game_id, puzzle_date)`, so only the latest Score per key matters; keying per game stops a second game played offline from discarding the first game's pending Score. Flushed to `game_scores` on deactivate, or on the next page mount if an entry exists (the safety net for a player who forgot to deactivate). Kept on flush failure and retried. Flushing bypasses `useScoreSubmission` and calls `postScoreAwaitable` directly, since `postScore` is fire-and-forget and cannot report failure. The **one documented exception** to "`useGameStore` is the only localStorage writer" — it is not game state, so it gets its own key. **Only Leksokipos queues today**; the other games are playable offline but their Scores are lost. **Offline Mode is PARKED (2026-08-04)** — the drawer toggle is removed, so nothing can reach the outbox; the flush-on-mount stays live to rescue any entry stranded from the preview period. See `.claude/handoffs/offlineFeature-handoff.md`. (Not: queue, cache, retry buffer)

---

## Database tables (14)

> **Authoritative schema** — columns, types, constraints, RLS policies and indexes live in `supabase/migrations/` (the `*_baseline_remote_schema.sql` baseline plus any later migrations), **not here**. Change the schema only via a new migration file applied with `npx supabase db push`; never edit the live DB without one, or the repo drifts. This table documents each table's **purpose** and the shape of its `jsonb` blobs (which the DDL can't express).

| Table | Purpose |
|---|---|
| `player_profiles` | Device identity: `device_uuid` → `display_name`. Optional `auth_user_id` links a Google account and is the durable identity anchor — authoritative device→account map, unique partial index on `auth_user_id` (ADR 0012; column introduced by ADR 0007). Nullable `selected_badge_id` holds the player's Display Badge preference (base achievement id; written only via `/api/profile/badge`, which validates ownership — ADR 0013 amendment). |
| `transfer_codes` | Single-use 6-char codes for cross-device identity transfer, 24h TTL. **Server-only**: zero anon RLS policies (migration `20260716120000`) because a code maps to a `device_uuid` — the platform's bearer credential; both `/api/transfer` routes use the service-role client, and the claim is an atomic conditional UPDATE (single-use enforced by the write). |
| `game_scores` | Unified leaderboard for all games, keyed by `game_id` (`leksokipos`/`leksiarxeio`/`leksindeseis`/`vrestifrasi`/`leksodromia`/`leksoplegma`) + `device_id`. Leksiarxeio writes one row per `word_length`. Device-keyed only — no `auth_user_id` column; Sign-in Restore makes the adopted DeviceId canonical, so device_id serves anonymous and AuthLinked players alike (the device→account map lives in `player_profiles`). |
| `game_state` | Serialised Session for cross-device sync (Leksokipos daily puzzles only). Blob: `{ foundWords: string[] }`. Pushed after every valid word; pulled on mount when local progress is empty. Both require ProfileLinked. |
| `nominations` | Community word proposals (add / remove a word). One *pending* row per normalized (word, direction) — DB-enforced partial unique index (migration `20260716120200`); a duplicate POST answers `409 already_pending` + the existing id, and the client pivots to upvoting it. |
| `nomination_votes` | Up/down votes on nominations, one per device — DB-enforced `UNIQUE(nomination_id, device_id)` (migration `20260716120200`); the toggle route resolves insert races instead of 500ing. |
| `community_leksiarxeio_puzzles` | Player-submitted Leksiarxeio puzzles. One row = all 5 lengths (`data` jsonb `{"4":…,"8":…}`). Served on its `scheduled_date`; never deleted on serve. |
| `community_leksindeseis_puzzles` | Player-submitted Leksindeseis puzzles (`data` jsonb 4-group array). Served on its `scheduled_date`; never deleted on serve. |
| `community_vrestifrasi_puzzles` | Player-submitted Vres Tin Frasi phrases (`data` jsonb `{ "phrase": "…" }`). Served on its `scheduled_date`; never deleted on serve. |
| `community_stavrolekso_puzzles` | Community-submitted crosswords (`data` jsonb slot-based; PIN-gated creator edits). **Never deleted after approval.** `edit_pin` is the creator-edit flow's only authorisation (ADR 0005), so anon/authenticated hold a **column-level** `SELECT` grant over the public browse columns only (migration `20260717120000`) — RLS cannot filter columns, so the grant is what keeps the PIN out of a direct PostgREST read. The PATCH route's PIN lookup and UPDATE are both service-role. anon keeps INSERT (the maker's submit path writes a PIN it cannot read back). |
| `identity_audit` | Append-only log of identity-mapping changes, written by `/api/auth/link` when a link establishes a mapping the profile row didn't already hold. Service-role only (RLS on, zero policies); never pruned. Backs Admin Restore (ADR 0012). |
| `player_achievements` | Immutable earned-Achievement facts: one row = one Achievement (one-shot or tier id) a device earned. `UNIQUE(device_uuid, achievement_id)`, insert-if-absent (never revoked). Anon RLS = SELECT+INSERT only since migration `20260716120100` — the DB itself enforces append-only against the public key; deletes/updates are service-role only (merge, cron). Append-forever — never swept. Unioned onto the canonical identity on Sign-in Restore (ADR 0013). |
| `player_milestones` | Append-only fact rows for every countable Badge input (`20260807120000`, absorbing the former `player_pangrams` + `player_words`): one row = one milestone a device reached on one `puzzle_date`, under one of four `kind`s — `pangram` and `word` (`detail` = the word), `top_rank` and `tzimani` (the two lifetime **day counters**, `detail` = `''`). `value` holds the word length on `word` rows (stamped server-side) and the achieved found-word percentage on `tzimani`; NULL elsewhere — absent is not zero. `UNIQUE(device_uuid, puzzle_date, kind, detail)`, insert-if-absent; progress is always `COUNT(*)`, never a counter. **`detail` is `NOT NULL DEFAULT ''` on purpose** — Postgres treats NULLs as distinct in a unique index, so a nullable `detail` would let the same day insert twice and break insert-if-absent. **No `game_id` column**: a second earning Game must add it *and* widen the UNIQUE in one migration, or its rows silently collide with Leksokipos'. Only 10+ letter finds are stored as `word` rows (`WORDS_MIN_TRACKED`, filtered client-side and enforced server-side). Read via two invoker-rights aggregate RPCs that never fetch rows: `player_milestone_counts` (GROUP BY kind, feeds `/api/profile/stats` and the POST response) and `player_milestones_by_length` (feeds Words by Length). Anon RLS = SELECT+INSERT only (`20260716120100` posture), append-forever — never swept. Unioned on Sign-in Restore via `planMilestoneMerge`. Beta capture data (ADR 0013 launch-reset class). |

---

## Persistence decisions

**API rate limiting — accepted risk (2026-06-30)**
No per-device rate limiting is implemented on INSERT-capable API routes. RLS policies allow unlimited anon inserts. Decision: accept the risk at current scale. A Supabase row-count alert is the only guardrail (threshold: 50 000 rows on `game_scores`, 5 000 on `nominations`). Revisit with a Redis sliding-window approach (Upstash) when DAU exceeds ~500.

**Nominations retention policy (2026-07-01)**
`pending` and `rejected` Nominations are never deleted. Rejected rows are retained permanently because `NominationModal` uses them to warn players on re-submission (by word + direction). `accepted` Nominations are deleted 30 days after `reviewed_at` is set by `apply-nominations.ts` — at that point the word is in the JSON and deployed, and the row is pure audit trail. The `reviewed_at` column serves dual purpose: `null` = accepted but not yet applied to the word list; non-null = applied. See ADR 0011.

**`game_scores` is append-forever (2026-07-02; enforced in code 2026-07-05)**
Rows are never pruned. The 7-day leaderboard window is query-side only. Lifetime Stats, Streaks, and the derived-on-read lifetime-point Achievements all read full `game_scores` history, so deletion would silently corrupt them. (Achievements themselves are not backfilled — they start at zero at launch — but their live derivation from post-launch history still depends on nothing being pruned.) When the 50 000-row alert fires, the answer is "raise the alert / optimize storage" — never "prune history." **Until 2026-07-05 this was policy only — the daily `/api/cleanup-scores` cron still deleted `game_scores` older than 10 days (issue 03), so "Lifetime" Stats were really last-10-days stats.** The cron now prunes only the ephemeral tables (`game_state`, `transfer_codes`) governed by `SESSION_RETENTION_DAYS`; `game_scores` is untouched.

**DB-enforced integrity backstops + status enum (2026-07-16)**
Four migrations (`202607161200xx`) hardened what routes previously promised only in code: `transfer_codes` went server-only (no anon policies); the three anon `ALL (true)` policies became per-command (SELECT+INSERT, plus UPDATE only where the app upserts — `game_state`); the two check-then-act dedup flows got unique indexes (votes, pending nominations) with 23505 handling in the routes; and community `status` became the PG enum `community_puzzle_status ('pending'|'approved')` — enum over CHECK so the value union reaches TypeScript (ADR 0017 amendment). `'rejected'` is deliberately not a value (reject = DELETE); `nominations.status` keeps its different CHECK vocabulary (`accepted`, history retained) on purpose. Open anon INSERT everywhere remains the recorded accepted risk (see "API rate limiting").

**`player_profiles` cleanup — deferred (2026-07-01)**
No deletion policy is implemented. `last_active` is updated on every profile upsert (POST /api/profile) so it reflects genuine activity when cleanup is eventually designed.

---

## Flagged ambiguities

**"Score" is overloaded** — Leksokipos Score = accumulated word points (higher = better). Leksiarxeio Leaderboard Score = sum of In-game Points across 5 Lengths (higher = better). API field is named `score` for interface compatibility only.

**"Valid words" is context-dependent** — In Leksokipos it's the accepted-answer list. In Leksiarxeio it's the guess-validation pool (same file as the Answer pool).

**Leksindeseis Puzzle has no `id`** — Identified by `date` alone. Inconsistent with the other two games; treat `date` as the effective ID.
