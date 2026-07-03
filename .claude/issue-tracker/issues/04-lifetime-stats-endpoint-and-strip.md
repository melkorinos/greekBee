# Lifetime-stats endpoint + strip

Status: ready-for-agent

## Parent

`.claude/handoffs/profilePageAndAchievements.md` (§3, §5 slice 3, decisions 3 & 7).

## What to build

A read-only lifetime-stats endpoint and the three-number strip that renders it on `/profile`.

- **Endpoint**: `GET /api/profile/stats?device_uuid=` on the edge runtime, fetch-only and read-only. Returns `{ total_points, puzzles_played, tzimani_count }` computed over `game_scores` where `device_id = device_uuid`: `SUM(score)`, `COUNT(*)`, `COUNT(*) FILTER (is_perfect)`. Add `Cache-Control: private, max-age=60` as a courtesy and document the no-cache-needed rationale in the route header.
- **Strip**: three real numbers on the profile page below the account controls. Loading skeleton while fetching; on fetch error hide or dash the strip — **never block the page**.

Notes carried from the handoff:
- Stats key is `device_uuid` (Sign-in Restore repoints all score rows to the canonical `device_uuid`; `auth_user_id` is an anchor index, not a stats key).
- No custom-puzzle filter needed — custom puzzles never post to `game_scores` (`useScoreSubmission` `enabled:false`), so the table is daily-only already.
- Cross-game by design; label the points number "Πόντοι" generically (per CONTEXT.md, "Score" is overloaded).
- No streaks in v1 (they pair with future streak achievements — designed there).
- Never expose `device_uuid` in shareable URLs; the response carries only aggregates.

## Acceptance criteria

- [ ] `GET /api/profile/stats?device_uuid=` runs on the edge, is read-only, and returns `{ total_points, puzzles_played, tzimani_count }` for the given device.
- [ ] Values are correct: `SUM(score)`, `COUNT(*)`, and perfect-game count (`is_perfect`) over that device's `game_scores` rows.
- [ ] Response sets `Cache-Control: private, max-age=60`; route header documents the rationale.
- [ ] Strip shows a loading skeleton while fetching and degrades gracefully (hide/dash) on error without blocking the page.
- [ ] Points labelled "Πόντοι"; Greek-only strings; Tailwind tokens only.
- [ ] `npm run test -- --run`, `npx eslint .`, `npm run build` all green.

## Blocked by

- `02-profile-route-identity-header-restore-redirect` (the strip renders on the profile page).
