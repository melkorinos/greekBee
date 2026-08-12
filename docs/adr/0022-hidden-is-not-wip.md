# ADR 0022 — `hidden` is a second presentation state, orthogonal to `wip`

**Status:** accepted (2026-08-12)
**Extends:** [ADR 0020](0020-registry-capabilities-presentation-derives-behaviour-enrols.md) — presentation
derives from the registry rows; this ADR adds a second row that presentation derives *from*.

## Context

Eleven Games are registered and three carried `wip: true`: **Leksindeseis**, **Πόσο κάνει;** and
**Λογοπαίγνιο**. All three rendered on the picker and in the drawer under a «🚧 Υπό κατασκευή»
section.

The operator's 2026-08-11 launch decision put all three out of scope for the soft launch — hidden
from view, neither promoted nor finished. That signage was honest for an audience of three friends;
for strangers arriving from an announcement, three of eleven cards saying the site is unfinished
reads as abandonment.

Flipping nothing but `wip` cannot express the decision, because **the three Games are not in the
same state**:

- **Πόσο κάνει;** and **Λογοπαίγνιο** are genuinely unfinished — one placeholder puzzle each.
- **Leksindeseis is finished.** It is fully built and community-backed, and has carried `wip: true`
  since the registry was first written simply because nobody flipped it (found in session 138, when
  a docs audit discovered every document calling it Live). It is not launching; that is a different
  fact from being unfinished.

Overloading `wip` to mean both would lose that distinction permanently, and ADR 0020's header block
documents the registry's state design deliberately — a code comment saying "this one is different"
is exactly the kind of claim that rots.

## Decision

**Two presentation states on `GameRegistryRow`, both required, and orthogonal:**

| Field | Means | Player-facing effect |
|---|---|---|
| `wip` | The Game is **unfinished** — placeholder content, missing copy. | None on its own. |
| `hidden` | The Game is **deliberately not shown**, finished or not. | Absent from the picker and the drawer. |

Neither implies the other. Today all three hidden Games are also `wip`, and Leksindeseis is the row
that proves the split earns its keep: it is `wip: true` **and** finished **and** hidden, for three
reasons that a single flag would flatten into one.

**A hidden Game keeps its route.** `/leksindeseis`, `/posokanei` and `/logopaignio` still load and
play by direct URL in every environment — production included. No redirect, no 404, no environment
gate. Hidden means *unlisted*, not *disabled*: anyone holding a link still plays, which is how the
operator plays them. This also keeps the surface identical in local, preview and production, so what
is eye-checked on preview is literally what strangers get.

**A hidden Game keeps its `capabilities`.** Hiding is presentation; it revokes nothing. Leksindeseis
keeps `scores` and `leaderboard`, and a Score posted from its live route is a real Score.

**There is no «Υπό κατασκευή» surface any more.** The picker section, the drawer section and the
card's 🚧 chip are all deleted rather than left dormant. The reasoning in this ADR's Context
generalises: an unfinished Game is now *hidden*, never signposted. Reintroducing the signage is a
product decision that should be made deliberately, not inherited from markup nobody removed.

## Consequences

- Three surfaces filter on `hidden`, each probe-tested in `registryCoverage.test.tsx` against a
  Game injected into the registry that no list can name: the picker (`src/app/page.tsx`), the drawer
  (`src/components/shared/Shell.tsx`), and the Offline Mode set (`src/hooks/useOfflineMode.tsx`).
- **The Offline Mode fix is for a feature that is parked.** `OFFLINE_GAME_IDS` filtered on `!wip`
  alone, so a hidden-but-finished Game would silently join the prefetch set. Nothing breaks today —
  the mode is unreachable (ADR 0010) — but parked code is exactly what a future revival trusts, and
  the bug would surface for whoever revives it rather than for whoever hid the Game.
- `hidden` is **required** on every row, not optional. `GAME_REGISTRY` is `as const satisfies`, so an
  omitted field makes `GAME_REGISTRY[id].hidden` a type error on the union — and requiring it forces
  every new Game to state its intent, the same posture `capabilities` already takes.
- After this change `wip` has exactly one runtime consumer: the Offline Mode filter. It is otherwise
  documentation. That is deliberate — `wip` describes the content, `hidden` describes the shelf.
- **Unhiding is a checklist, not a one-line edit** — the same trap session 121 hit with Topothesies.
  Flip `hidden`, confirm the `[data-game]` accent row exists, confirm the `capabilities` are the ones
  wanted, and re-read the Game's content supply before promoting it.
- Leksindeseis's static fallback pool is **one placeholder puzzle** (measured 2026-08-11). Hiding the
  Game parks that problem; it becomes live work again the moment unhiding is considered.

## Alternatives rejected

- **A single `visibility: "live" | "wip" | "hidden"` enum.** Reads well until Leksindeseis needs to
  be unfinished-flagged *and* hidden at once, which an enum cannot say. The two facts are
  independent axes, so two booleans is the honest shape.
- **Reusing `wip` for all three.** The one-line edit that loses the reason the ticket exists — it
  re-brands a finished, community-backed Game as unfinished, and the next session to read the row
  would "fix" it.
- **A redirect or 404 on hidden routes.** Would take the Games away from the operator and from
  anyone holding a link, for no gain: an unlisted route is not a claim that the site is unfinished.
- **Revealing hidden Games off production** (`NEXT_PUBLIC_VERCEL_ENV !== "production"`). Considered
  and declined on 2026-08-12: it makes the preview picker differ from the production picker, which
  is the exact surface this change exists to get right. Direct URL already covers testing.
