# Parked badge ideas — grill each before any build

Status: needs-triage

Carried out of the deleted `badges-parked.md` (2026-07-18) when its item 5 shipped as the badge-display slice (glyphs + player-selected leaderboard badge — see ADR 0013 amendment). Everything below is **not committed scope**; each item needs `/grill-with-docs` → `/tdd`, promoted one at a time.

Built on ADR 0013 (`player_achievements` immutable fact rows; lanes A client-live / B deferred-server / C append-only-set). The shipped pangram tier is the lane-C reference implementation.

## 1. New Τζιμάνι conditions

`leksokipos-tzimani` was freed in session 108 (catalog entry removed; prod already held 0 rows — ADR 0013 records the frozen-id exception). The operator wants the badge re-awarded **under different, less demanding conditions** than "found all the words". Define those conditions in the grill; frozen-id rule applies again the moment it re-ships. The in-game completion mechanic survives (board lock + ΤΟ ΠΕΘΑΝΕΣ, `allWordsFound`) — only the reward is gone.

## 2. Placement / podium badges — **agreed next promotion (2026-07-18 grill)**

Lifetime 1st/2nd/3rd counts flow from `/api/profile/stats` since session 109 (`countPodiumFinishes`) — tiered podium badges can ride the same stats read-back as the points tiers (lane-C-style crossing detection, no new capture). A *live* "you finished 1st today" badge is different: it needs the lane-B deferred puzzle-close job — where the job runs (Vercel cron route, no Supabase edge functions here), what "close" means against puzzle rollover, tie handling, idempotency (insert-if-absent, crons retry).

## 3. Additional cumulative-stat badges (lane C)

"Reached rank N this many times" etc. — mirror the pangram tier exactly: set-table + insert-if-absent route + Restore union + sync lane + thresholds in `achievementTuning.ts`. Open per item: qualifying event, unique-constraint columns (keep the `puzzle_date` dimension so pivots stay query changes), thresholds.

## 4. Words-by-length badges

Once pickup-03 data accrues — e.g. tiered "long-word hunter" over the `player_words` counts. Same stats-read-back crossing pattern as points/pangram tiers.

## 5. Pangram tier threshold balance pass

`pangramTierThresholds` (10/20/50 in `achievementTuning.ts`) were placeholders; re-tune once real pangram-rate data exists. Tuning/query edit only — no migration. (Also see issue `11-pangram-tier-prod-smoke-check.md` for the still-pending human toast/chip check.)

## 6. Badge display follow-ups (from the shipped slice)

Deliberately out of the 2026-07-18 slice: multiple displayed badges + precedence rules, custom icon art (emoji glyphs are interim — operator: "will improve later"), badge earning outside Leksokipos.
