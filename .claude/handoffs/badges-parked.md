# Handoff (parked): Badge ideas — grill before any build

**Date:** 2026-07-18 · **Status:** ⚪ **Parked — not committed scope.** The ONE badge handoff kept when the old achievements/stats handoffs were closed out (operator, 2026-07-18). Every item below needs `/grill-with-docs` → `/tdd` before build; promote items one at a time.

Built on Epic A + ADR 0013 (`player_achievements` immutable fact rows; lanes A client-live / B deferred-server / C append-only-set). The shipped pangram tier is the lane-C reference implementation.

## 1. New Τζιμάνι conditions

`leksokipos-tzimani` was freed in session 108 (catalog entry removed; prod already held 0 rows — ADR 0013 records the frozen-id exception). The operator wants the badge re-awarded **under different, less demanding conditions** than "found all the words". Define those conditions in the grill; frozen-id rule applies again the moment it re-ships. Note the in-game completion mechanic survives (board lock + ΤΟ ΠΕΘΑΝΕΣ, `allWordsFound`) — only the reward is gone.

## 2. Placement / podium badges

Lifetime 1st/2nd/3rd counts flow from `/api/profile/stats` since session 109 (`countPodiumFinishes`) — so **tiered podium badges can ride the same stats read-back like the points tiers** (lane-C-style crossing detection, no new capture). A *live* "you finished 1st today" badge is different: it needs the lane-B deferred puzzle-close job, with the open questions carried from the old handoff — where the job runs (Vercel cron route, no Supabase edge functions here), what "close" means against puzzle rollover, tie handling, idempotency (insert-if-absent, crons retry).

## 3. Additional cumulative-stat badges (lane C)

"Reached rank N this many times" etc. — mirror the pangram tier exactly: set-table + insert-if-absent route + Restore union + sync lane + thresholds in `achievementTuning.ts`. Open per item: qualifying event, unique-constraint columns (keep the `puzzle_date` dimension so pivots stay query changes), thresholds.

## 4. Words-by-length badges

Once pickup-03 data accrues — e.g. tiered "long-word hunter" over the `player_words` counts. Same stats-read-back crossing pattern as points/pangram tiers.

## 5. Richer inline leaderboard badges (pure display)

More inline `Badge` glyphs on leaderboard rows, over already-earned ids — no detection, no schema. Note: the 🏛️ is_perfect glyph precedent is **gone** after pickup-01; the leaderboard row currently carries no glyphs. Open: which earned ids surface inline vs Trophy-Case-only, glyph legibility at row scale, precedence when a player holds several.

## 6. Pangram tier threshold balance pass

`pangramTierThresholds` (10/20/50 in `achievementTuning.ts`) were placeholders; re-tune once real pangram-rate data exists. Tuning/query edit only — no migration. (Also see issue `11-pangram-tier-prod-smoke-check.md` for the still-pending human toast/chip check.)
