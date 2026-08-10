# Replace every emoji badge glyph with a drawn SVG mark, and the 🥉🥈🥇 medals with a tier frame

**Status:** ready
**Spec:** `.claude/aiHelper/html/badge-visual-grill.html` (open it — it renders every decision below at
every real size in both themes) · ADR 0013 §7 · this file carries the exact values

## Why

Emoji glyphs read as cheap, render differently on every platform, and cannot be tuned for weight or colour.
Worse, `display_name` has **zero validation** — `/api/profile` only does `trim()` — so a player with an emoji
in their name sits beside an emoji badge and the two are indistinguishable. A drawn mark can never be mistaken
for a name character. Emoji in names stays allowed by decision; the badge is what changes.

**Art is display copy. No id, no schema, no API and no earned row changes.** `DisplayBadge` still carries
`achievementId` + resolved `tier`, and the catalogue is still resolved client-side. Nothing here can un-earn
anything, so this ships independently of the deploy window and of `launch-reset.sql`.

## The design, settled

A badge is three layers: a **ring** in the tier's strong colour, a **disc** behind the mark in the tier's soft
colour, and the **mark**, which is always `currentColor` and never changes with tier.

- **Circle.** Ring width = `size / 10` (min 1px). Mark occupies **66%** of the inner box.
- The mark never carries tier colour → **five drawings total**, reused at every tier and size.
- **Μακρυλέξης is one badge** with four tier frames. Its four per-length emoji are deleted; the four frozen
  award ids and the tier *labels* (Σιδηρόδρομος / Υπερταχεία / Νταλίκα / Σεντόνι) are untouched.
- **Διαμάντι is a hue and nothing else** — no doubled ring, no alternate shape.
- **Locked** = neutral frame built from existing tokens (`border` ring, `surface-raised` disc, `muted` mark,
  55% opacity). No greyscale filter, no borrowed tier colour, and **the mark stays visible** so a player can
  see what they are chasing. This deletes the 🔒.
- **Per-game accent is deliberately deferred** — the mark stays neutral on all eleven boards. Revisit only if
  badge earning ever leaves Leksokipos.

### The eight tokens (`src/app/globals.css`)

| token | role | light | dark |
|---|---|---|---|
| `--tier-chalkino` | ring | `#b0713a` | `#d99a5f` |
| `--tier-chalkino-soft` | disc | `#f6e8dc` | `#3a2a1d` |
| `--tier-asimenio` | ring | `#8a94a0` | `#b6c0cc` |
| `--tier-asimenio-soft` | disc | `#edeff2` | `#2b3138` |
| `--tier-chryso` | ring | `#c2951c` | `#e8c04e` |
| `--tier-chryso-soft` | disc | `#faf0cf` | `#3d3218` |
| `--tier-diamanti` | ring | `#4f9fbc` | `#7fd0e3` |
| `--tier-diamanti-soft` | disc | `#e2f2f8` | `#17323c` |

Declared twice (light `:root` + the dark block), then eight `@theme inline` lines so Tailwind exposes
`bg-tier-chryso-soft` and friends. Raw hex is correct **here only** — this is where tokens are defined.
Anywhere else it fails `noRawPaletteClasses.test.ts`.

### The five marks — `viewBox="0 0 24 24"`, single path, `fill="currentColor"`

Every mark is one flattened path (the petals are twelve arcs, not six `<ellipse>` elements), so the catalogue
stores plain path data and never raw SVG markup.

```
Στην Κορυφή       κορυφή    M14 3.2 22 20.4H6zM6.8 9.8 12.6 20.4H2z

Μακρυλέξης        γραμμές   M9.6 3h1.6L4.6 21H1.4zM12.8 3h1.6L22.6 21h-3.2zM8.2 9h7.6v1.9H8.2zM5.8 15.6h12.4v2.1H5.8z

Τζιμάνι           πέταλα    M12.00 8.90A3.8 3.2 -90.00 0 1 12.00 1.30A3.8 3.2 -90.00 0 1 12.00 8.90ZM14.68 10.45A3.8 3.2 -30.00 0 1 21.27 6.65A3.8 3.2 -30.00 0 1 14.68 10.45ZM14.68 13.55A3.8 3.2 30.00 0 1 21.27 17.35A3.8 3.2 30.00 0 1 14.68 13.55ZM12.00 15.10A3.8 3.2 90.00 0 1 12.00 22.70A3.8 3.2 90.00 0 1 12.00 15.10ZM9.32 13.55A3.8 3.2 150.00 0 1 2.73 17.35A3.8 3.2 150.00 0 1 9.32 13.55ZM9.32 10.45A3.8 3.2 210.00 0 1 2.73 6.65A3.8 3.2 210.00 0 1 9.32 10.45Z

Κυνηγός Πανγκράμ  κεραυνός  M14.2 2.2 3.6 13.9h5.9l-1 7.9L20.4 10.1h-6.1z

Συλλέκτης Πόντων  λίθος     M7.6 2.6h8.8l4.8 6.4L12 21.4 2.8 9z
```

Τζιμάνι's six petals are generated from `FlowerGrid`'s own construction — six ellipses with the major axis
radial, at the board's real proportions (`petalLength 46 / petalWidth 37 / petalDist 90`). If that geometry
ever changes, this mark should follow it.

## Scope

- [ ] `src/app/globals.css` — add the eight tokens to `:root` and to the dark block, plus eight
      `@theme inline` mappings.
- [ ] `src/games/leksokipos/lib/achievements.ts` — replace `Achievement.glyph: string` with
      `mark: { path: string; viewBox: string }`; add the five paths above; **delete `TIER_MEDALS`**;
      **delete `glyph`** from `WORD_LENGTH_BADGE_META` and `WORD_LENGTH_BADGES` (four dead emoji — only the
      top rung's ever rendered, because the Trophy Case tier chips are text-only).
- [ ] New `src/components/shared/BadgeMark.tsx` — renders the frame + mark. Props: the mark, the resolved
      tier or `null`, a pixel size, and a `locked` flag. It earns its place in `shared/` because all three
      surfaces below consume it. Tailwind cannot emit an arbitrary runtime pixel size, so the ring width and
      box are set through CSS custom properties on the element, exactly as the spec page does.
- [ ] `src/styles/recipes.ts` — delete `lbBadgeMedal`; simplify `lbBadgeChip` (the left divider between name
      and badge stays, the inner divider before the medal goes).
- [ ] `src/components/shared/LeaderboardBadge.tsx` — render `BadgeMark`, drop the medal span. Keep the
      existing `title` / `aria-label` (name + tier label); the mark itself is `aria-hidden`.
- [ ] `src/components/profile/TrophyCase.tsx` — earned and locked tiles both render `BadgeMark`; delete the
      🔒 fallback, the `grayscale` class, and the `tile-medal-*` span.
- [ ] `src/components/leksokipos/AchievementToast.tsx` — swap the fixed 🏆 for the earned badge's mark.
      **Check first whether `EarnedToast` carries the base achievement id**; if it only has `name` and
      `tierLabel`, extend it, and extend whatever builds it in `useAchievementSync`.
- [ ] Tests — `src/test/leksokipos/achievements.test.ts` (the glyph assertions become mark assertions; keep
      the "every entry has one" guard, now over `mark.path`), `src/test/profile/TrophyCase.test.tsx`
      (`tile-medal-*` testids), `src/test/shared/leaderboardBadge.test.tsx` (medal rendering).
- [ ] ADR 0013 §7 — already repointed at this ticket when the handoff was deleted, and it currently describes
      the design as *specified*. Amend it again to describe the design as *shipped*, per the standing rule that
      an amendment never merges ahead of the code it describes.

## Done when

- `npm run test -- --run`, `npx eslint .` and `npm run build` all pass with zero failures.
- `npm run test:e2e` passes — this touches shared chrome, so the Playwright suite is mandatory before the
  branch is called ready.
- No emoji renders on any of the three badge surfaces: leaderboard chip, Trophy Case tile (earned **or**
  locked), unlock toast.
- `TIER_MEDALS`, `lbBadgeMedal`, and every `glyph` field are gone from the codebase.
- A Trophy Case with a mix of earned and locked badges reads correctly in **both** themes, and the
  leaderboard chip is legible beside a display name that itself contains an emoji.
- ADR 0013 §7 describes the shipped design and cites no deleted file.
