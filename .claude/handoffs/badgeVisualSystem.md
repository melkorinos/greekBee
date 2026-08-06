# Handoff: Badge Visual System — SVG marks + tier treatment

**Date:** 2026-08-06
**Status:** Design not started — decided in principle, nothing drawn, nothing built
**Goal:** replace every emoji badge glyph with a drawn SVG mark, and replace the 🥉🥈🥇 medals with a
tier treatment on the mark itself

---

## Why this exists

Two operator problems, one answer.

1. **Emoji read as cheap and do not scale.** They render differently on every platform, they cannot be
   tuned for weight or colour, and they look wrong at both the small size (leaderboard row) and the large
   one (Trophy Case tile).
2. **Emoji badges collide with emoji names.** `display_name` has **zero validation** — `/api/profile`
   does `trim()` and falls back to `Ανώνυμος` ([route.ts:35](../../src/app/api/profile/route.ts#L35)) —
   so a player with an emoji in their name sits next to an emoji badge and the two are indistinguishable.
   **Emoji in names stays allowed by decision.** The badge is what changes.

A drawn mark solves both at once: it can never be mistaken for a name character, and it is designed rather
than inherited.

## What this does NOT touch

**No id, no schema, and no earned row depends on badge art.** Art is display copy. This work can land at
any time, in any order, independently of the catalog rebuild — that decoupling is deliberate and is what
makes it safe to defer. Do not let this handoff become a blocker for anything.

## Read first

- **ADR 0013, the 2026-08-06 amendment** — the catalog rebuild this art is drawn for. §7 is this handoff's
  charter; §5 fixes the tier ladder; §3 says which badges exist.
- **ADR 0008 / 0009** — the theming posture. Non-negotiable for this work, see Constraints.
- `src/games/leksokipos/lib/achievements.ts` — the catalog, the `glyph` field, `TIER_MEDALS`.

## What must be drawn

**Five base marks.** After the ADR 0013 rebuild the catalog is:

| Badge | Earned for | Rungs |
|---|---|---|
| Στην Κορυφή | reaching the top rank, 1 / 10 / 25 lifetime days | 3 |
| Μακρυλέξης | finding a word of exactly 10 / 11 / 12 / 13 letters | **4** |
| Τζιμάνι | finding 80% of a puzzle's words, 1 / 5 / 10 lifetime days | 3 |
| Κυνηγός Πανγκράμ | lifetime distinct pangrams, 10 / 20 / 50 | 3 |
| Συλλέκτης Πόντων | lifetime points, 1000 / 10000 / 25000 | 3 |

**Every badge in the game is now tiered** — Πρώτα Βήματα was removed and the last two one-shots were
converted, so the catalog has no one-shot entries left. The tier treatment is not decoration on a subset;
it is how every badge reads. Design it first, not last.

**Μακρυλέξης is the exception to plan around**: four rungs, not three, and its `diamanti` rung sits above
gold. Whatever the tier treatment is, it must extend to a fourth step without looking bolted on.

## Surfaces the marks appear on

1. **Leaderboard chip** — `src/components/shared/LeaderboardBadge.tsx`, recipes `lbBadgeChip` /
   `lbBadgeMedal`. Small, inline, beside a name, currently `text-xs`. This is the size that must survive
   first; if the mark is illegible here it is the wrong mark.
2. **Trophy Case tile** — `src/components/profile/TrophyCase.tsx`. Large, in a grid, and needs **two
   states**: earned (lit) and locked (greyed, showing the unlock hint). The locked state is part of the
   design, not a CSS afterthought — a greyed emoji works, a greyed mark may not.
3. **Unlock toast** — fires in-game on a genuinely-new earn (`useAchievementSync` →
   `AchievementToast`). Mid-size, transient, over the game board.

## Constraints

- **Semantic tokens only.** ADR 0008 forbids literal palette classes (`stone-`/`zinc-`/`amber-`…) and
  hand-written `dark:` pairs, and `noRawPaletteClasses.test.ts` enforces it. **The three tier colours must
  become named tokens in `globals.css`** — bronze/silver/gold as raw values will fail the guard test.
- **Both themes.** Light default plus a manual dark toggle (ADR 0002). A gold that only works on white is
  half a design.
- **Per-game accent exists** (`[data-game]` rows, ADR 0009) and badges appear on **every game's**
  leaderboard, not just Leksokipos'. The mark cannot assume Leksokipos' accent colour.
- **Inline, not fetched.** Marks ship as inline SVG or a sprite in the bundle — no network request per
  badge on a leaderboard row.
- **`glyph` is typed `string`.** Moving to components or sprite ids is a type change in `Achievement`
  plus every consumer of `glyph`; small, but it is the one code change this work implies.

## Open decisions for the next session

These were deliberately left to whoever picks up the design:

1. **Who draws the marks** — hand-drawn by the operator, a licensed icon set, or generated. Cost and
   licence posture differ; a licensed set may need an attribution line the way the ODbL map data does.
2. **What the tier treatment is.** The sketch offered during the grill was a tier-coloured ring around the
   mark plus tier colour on the mark itself, but nothing is committed. It must read at `text-xs`.
3. **Whether the marks share a visual system with the game accents** or stand deliberately apart from them.
4. **The locked state** — greyscale, outline-only, or a distinct silhouette.

## Related

- `.claude/handoffs/badgeIdeas.md` — the parked-badge backlog. Item 6's "custom icon art" thread is what
  this handoff promotes out of it.
- ADR 0013 amendment 2026-08-06 §6 — one displayed badge, permanently. No precedence system will exist, so
  the chip never has to render two marks side by side.

## Suggested skills

- `/grill-with-docs` — pin the tier treatment and the sourcing decision before any drawing. Every open
  decision above is under-specified on purpose.
- `/prototype` — the fastest way to answer "does this mark read at `text-xs`" is to render all five at
  both sizes in both themes and look at them.
- `/to-tickets` then `/tdd` — once the design is fixed. The code side is small: token additions, the
  `glyph` type change, and the three surfaces.
