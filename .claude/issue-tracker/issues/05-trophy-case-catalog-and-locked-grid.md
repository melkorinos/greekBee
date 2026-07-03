# Trophy-case catalog + locked grid

Status: ready-for-agent

## Parent

`.claude/handoffs/profilePageAndAchievements.md` (§4, §5 slice 4, decision 4).

## What to build

The Trophy Case display surface: a pure catalog module plus an all-locked/greyed grid on `/profile`. **No detection or tracking logic** — this slice only renders placeholders so the layout can be tested. Earned wiring, the `player_achievements` table, and the detection engine belong to `achievementsLeksokipos.md`.

- **Catalog** (`src/games/leksokipos/lib/achievements.ts`, pure, zero React imports): entries shaped `{ id, name, hint, kind: "oneshot" | "tiered", tiers?: [{ id, tier, threshold, label }] }` plus a future predicate *signature* only (no implementation). Each tier carries its own frozen `id` (`-chalkino/-asimenio/-chryso`) — these become `player_achievements.achievement_id`, so **ids freeze on first deploy**; renaming/removing ids after ship is forbidden, adding new tiers later is fine.
- **Grid**: renders the whole catalog greyed/locked. Each tile shows the Badge glyph, Greek name, and unlock hint; tiered entries show a tier row (Χάλκινο/Ασημένιο/Χρυσό thresholds). Starts page-local — nothing graduates to `src/components/shared/` speculatively.

Catalog v1 (approved — placeholders, thresholds soft, ids frozen):

One-shot: `leksokipos-first-daily` (Πρώτα Βήματα), `leksokipos-stin-korifi` (Στην Κορυφή), `leksokipos-tzimani` (Τζιμάνι), `leksokipos-sidirodromos` (Σιδηρόδρομος), `leksokipos-theristis` (Θεριστής).

Tiered: `leksokipos-kynigos-pangram-{chalkino/asimenio/chryso}` (Κυνηγός Πανγκράμ — 10/20/50), `leksokipos-syllektis-ponton-{chalkino/asimenio/chryso}` (Συλλέκτης Πόντων — 1.000/10.000/25.000).

Full names, hints, and detection notes are in §4 of the handoff.

## Acceptance criteria

- [ ] `src/games/leksokipos/lib/achievements.ts` exports the full v1 catalog with the frozen ids above; pure, zero React imports.
- [ ] Tiered entries carry per-tier frozen ids (`-chalkino/-asimenio/-chryso`) and their thresholds/labels.
- [ ] Predicate is a type signature only — no detection logic in this slice.
- [ ] `/profile` renders a grid over the catalog, every tile greyed/locked, showing glyph, Greek name, and unlock hint.
- [ ] Tiered tiles show a tier row with the three Greek tier words and thresholds.
- [ ] Grid is page-local (not promoted to `src/components/shared/`); Tailwind tokens only; Greek-only strings.
- [ ] `npm run test -- --run`, `npx eslint .`, `npm run build` all green.

## Blocked by

- `02-profile-route-identity-header-restore-redirect` (the grid renders on the profile page).
