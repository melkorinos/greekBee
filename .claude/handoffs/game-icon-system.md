# Handoff: game icons — replace the eight emoji with drawn, coloured marks

**Date:** 2026-08-10
**Status:** Nothing built, nothing designed. This file exists to make a grill productive — it carries the
scope, the code findings, and the questions. **Five things are settled** (below); every individual icon and
every palette is open.
**Goal:** One icon per live game, drawn and **colourful**, replacing the emoji the registry carries today.
**Owner:** Human-led grill (`/grilling` or `/grill-with-docs`), agent assist. Output = a ticket.
**Precedent:** `TICKET-03` (badge marks, shipped 2026-08-10, ADR 0013 §7). Read that first — it settled the
mechanics of drawn art in this codebase. **This job is deliberately different from it** — see settled item 2.

---

## Scope — the eight `wip:false` rows, and only those

| # | Game | Route | Registry emoji | `--game-accent` |
|---|---|---|---|---|
| 1 | Leksokipos | `/leksokipos` | 🌸 | `amber-400` |
| 2 | Leksiarxeio | `/leksiarxeio` | ✏️ | `green-600` |
| 3 | Vres Tin Frasi | `/vres-tin-frasi` | 💬 | `purple-600` |
| 4 | Leksodromia | `/leksodromia` | 🏁 | `red-600` |
| 5 | Leksoplegma | `/leksoplegma` | 🕸️ | `teal-600` |
| 6 | Topothesies | `/topothesies` | 🗺️ | `blue-700` |
| 7 | Stavrolekso | `/stavrolekso` | ♟️ | `sky-600` **(placeholder)** |
| 8 | Leksikastirio | `/leksikastirio` | ⚖️ | `indigo-600` **(placeholder)** |

**Out of scope by operator decision (2026-08-10):** Leksindeseis, Πόσο κάνει; and Λογοπαίγνιο — all three
are `wip:true`, and since 2026-08-12 all three are also **`hidden:true`** (ADR 0022), so they appear on no
picker or drawer surface at all. That strengthens the exclusion rather than changing it: there is currently
nowhere for their icons to render. They will need icons when they are unhidden; the grill should settle a
**rule** that covers them rather than leaving the set unextendable.

Note rows 7 and 8 are not dated games: Stavrolekso is a community crossword browser + maker with no
leaderboard, and Leksikastirio is the word-court, which `CONTEXT.md` says is not a game at all. They sit in
their own drawer section («Κοινότητα»). **Whether they belong in one icon set with the six games is a real
question, not a formality** — see Q3.

---

## Settled before the grill starts

1. **Scope is the eight rows above.** (Operator, 2026-08-10.)
2. **These are richer than the badge marks.** Badges stay iconic and flat — one path, one `currentColor`,
   tier lives in the frame. Game icons may be more illustrative, with depth and detail the badges never get.
   (Operator, 2026-08-10.) The consequence to hold onto: **a badge and a game icon must never be mistaken
   for one another**, and after this ships both will render on the same Profile Page.
3. **The method is s143's.** No visual decision gets made in prose. Every option goes into
   `.claude/aiHelper/html/` as a rendered comparison and the operator looks. This was expensive and correct
   last time — the locked-badge decision *changed* once the tiles were rendered side by side.
4. **The badge keeps the flower; Leksokipos takes a different image.** (Operator, 2026-08-10.) `TICKET-03`
   gave the six-petal flower to the **Τζιμάνι badge**, on the reasoning that a complete `FlowerGrid` — six
   outer letters plus the centre — literally *is* the seven-letter set, i.e. a pangram. That badge shipped.
   So the grill owes Leksokipos an icon built on something else the game genuinely is: the centre-letter
   constraint, the garden, the found-word ladder. **Do not reopen this by proposing a flower variant.**
5. **Colour is unconstrained.** (Operator, 2026-08-10.) An icon may use any palette; it does **not** have to
   derive from the game's `--game-accent`. That closes Q1 as a *permission* but not as a *decision* — see
   the two consequences now recorded under Q1, both of which the grill still has to face.

---

## What the code says — do not re-derive these

### The emoji is welded into the game's name

`GAME_REGISTRY.label` is `"🌸 Leksokipos"` — emoji and name in one string. The drawer renders `label`
([Shell.tsx:160](../../src/components/shared/Shell.tsx#L160), and again at 182 and 206 for the two other
sections). `emoji` renders standalone in exactly one place, the picker card
([page.tsx:200](../../src/app/page.tsx#L200), `text-3xl`).

**So replacing the drawer emoji means splitting `label` into icon + name**, which touches every consumer of
`label`. One of those is prose: the Profile Page renders it mid-sentence
([profile/page.tsx:117](../../src/app/profile/page.tsx#L117) and 136) — «Τα επιτεύγματα αφορούν το
🌸 Leksokipos, το πρώτο παιχνίδι.» An icon inside a sentence is a different design problem from an icon on a
card, and it may be the right place to keep a plain name with no art at all.

### The drawer is permanently dark, in both themes

The drawer panel is `bg-zinc-900` with `text-zinc-200` links
([Shell.tsx:144](../../src/components/shared/Shell.tsx#L144), 93) — raw palette classes with no `dark:`
pairs, i.e. a fixed dark surface. The picker card is `bg-surface`, which follows the theme.

**Every icon therefore renders on two grounds at once:** a theme-following card and an always-dark panel.
An icon tuned only for the light card will be the one that disappears in the drawer. The badge work solved
the equivalent problem by declaring each colour twice; whatever this grill lands needs the same discipline
or an explicit reason it doesn't.

### Two real sizes today, more if favicons come in

Picker card ≈ **30px** (`text-3xl`); drawer link ≈ **16–20px** (inline on a `font-medium` text line). If
favicon / OG / PWA art enters scope (Q2) that adds 16px, 32px and 180px, and raster export — a job the
badge work never had.

### Three of the eight accents are neighbouring blues, and two are placeholders

Topothesies `blue-700`, Stavrolekso `sky-600`, Leksikastirio `indigo-600`. That is three adjacent hues in a
set of eight that has to be separable at 16px. **Stavrolekso's and Leksikastirio's accents are documented
placeholders** — `goals.md` lists "real accent colours for stavrolekso/leksikastirio" as an open decision
inside the UI redesign, and `memory.md`'s Theming row says the same.

**Colour being unconstrained (settled item 5) resolves this by cutting it loose, not by answering it.** An
accent-derived icon set would have picked those two accents as a side effect; a free palette does not, so
they stay open and go back to open question 2 of `docs/launch-runbook.md`. **Two consequences to carry into the
grill:** the three-blues problem is now the *icons'* problem to solve on their own, since it can no longer be
fixed by retuning the accents; and the ticket has to say out loud that the placeholders remain unresolved, or
a future session will assume this work settled them.

### The accent tokens exist and are per-game already

`[data-game="…"]` rows in `globals.css` — 11 of them, one per registered game (ADR 0009). They cascade from
the game's root wrapper, so **on the picker and in the drawer there is no `[data-game]` in scope**: an icon
that wants its game's accent there must name the colour, not inherit `--game-accent`.

### Inherited constraints (not negotiable, from CLAUDE.md and ADR 0008)

- No raw hex outside `globals.css`. New colours are new tokens, declared light **and** dark.
- No inline styles except a computed runtime value (`BadgeMark`'s `--badge-size` is the precedent).
- No literal neutral palette classes; guard tests enforce it.
- Path data in config, never raw SVG markup — the badge catalogue's rule, and the reason every badge mark is
  one flattened path. **A multi-colour icon cannot be one path**, so this rule needs a deliberate successor:
  multiple paths each carrying a token name, a component per game, or something else. **This is Q4 and it is
  the one question with a storage consequence.**

---

## The open questions

### Q1 — Colour is unconstrained. Two consequences still need deciding.

**Answered as permission** (settled item 5): any palette, no obligation to the accent. What that does *not*
settle:

- **Does an icon's colour disagreeing with its page accent read as a bug?** Leksokipos is `amber-400` on
  every one of its own screens. A free-palette icon that is, say, green sits on the picker card two
  centimetres from nothing, but sits in the drawer directly above the link to an amber page. Worth rendering
  both ways rather than reasoning about.
- **Does this leave the two placeholder accents unsettled?** `sky-600` and `indigo-600` were going to be
  decided by an accent-derived icon set. With colour unconstrained they are **not** decided, and go back to
  open question 2 of `docs/launch-runbook.md`. Say so explicitly in the ticket, or they get lost.

**And bring the Leksiarxeio case here, because it constrains freedom in the other direction.** Its guess
tiles are already coloured by `--correct` / `--present` / `--absent`, solid fills *identical in light and
dark* with nothing to do with its `green-600` accent. The obvious Leksiarxeio icon is a tile row — and a tile
row drawn in anything other than the feedback colours is a picture of a different game. Free rein does not
help here; the game has already chosen.

### Q2 — Which surfaces lose their emoji?

Deferred to the grill. The candidates, in ascending cost:

- **Picker card + drawer nav** — the two places art renders today. Requires the `label` split above.
- **Inline in prose** — the Profile Page sentence. **Recommended: drop the art here, keep the plain name.**
  An icon jammed mid-sentence is a different design problem from an icon on a card, and «Τα επιτεύγματα
  αφορούν το Leksokipos» reads fine. Operator has not ruled; this is the agent's recommendation, not a
  decision.
- **Favicon / OG / PWA icons** — per-game tab and share-preview art. This is a materially bigger job (raster
  export, per-route metadata) and should probably be its own ticket even if the grill decides it's wanted.

### Q3 — Is this one set of eight, or six games plus two community marks?

Stavrolekso and Leksikastirio are not dated games, have no leaderboard, and live in their own drawer
section. An icon set that treats all eight identically says they are peers; one that gives the two community
surfaces a different treatment says they are not. The drawer already makes that distinction structurally.

### Q4 — What does a multi-colour icon look like in the config? *(the one with a storage consequence)*

The badge catalogue stores `{ path, viewBox }` and `BadgeMark` owns the single `<svg>`, so the data is plain
and no renderer has to trust it. Colour arrives from the frame, never the path. **That does not survive
contact with a multi-colour icon.** Options to put in front of the operator, with the rendered comparison:

- An array of `{ path, token }` pairs — data stays plain, one component still owns the `<svg>`, colours stay
  tokens. Costs: no gradients, no strokes-with-caps unless modelled, flat by construction.
- A component per game holding real JSX. Most expressive; puts art in the component tree, where no config
  rule can guard it, and it is one file per game — eight now, eleven once the `wip` games flip.
- A static asset per game under `public/`. Simplest to author, worst for theming — a file cannot respond to
  the dark drawer or a token change.

**Answer Q4 last, and note that settled item 5 has already raised its cost.** The current storage shape
survives an accent-plus-neutrals icon almost unchanged; it does not survive a free multi-colour palette,
which is now permitted. So this question is no longer "which option" but "how much expressiveness is worth
how much guardability" — and item 2 (*games are richer than badges*) pushes toward the expensive end.

### Q5 — What is the rule for the three hidden games?

Leksindeseis, Πόσο κάνει; and Λογοπαίγνιο are out of scope but will need icons when they are unhidden. That
flip is a documented checklist (`reflections.md`, the 2026-08-06 entry as updated 2026-08-14) — and note it
is now **two** registry flags, not one: ADR 0022 made `wip` and `hidden` orthogonal, and Leksindeseis is
finished-but-hidden while the other two are both. The parts of that checklist a guard test now owns
(`GAME_IDS`, the HomeTrophy branch) have been struck; what remains manual is both flags, the accent row,
the capability grant, content supply, and docs. The grill should land a rule the ninth icon can follow
without reopening any of Q1–Q4, and the checklist should gain an icon step.

---

## Per-game grill material

Each row is what the game *actually is*, plus the specific tension its icon has to resolve. The badge grill's
strongest moves came from reading the code — `FlowerGrid` being six petals plus a centre is what settled the
Τζιμάνι mark — so these are starting points, not answers.

| Game | What it actually is | The tension for its icon |
|---|---|---|
| **Leksokipos** 🌸 | 7 letters — one centre, six outer — on a flower. Find words that all use the centre letter; a pangram uses all seven. `FlowerGrid` is literally six ellipse petals around a centre disc. | **SETTLED (item 4): the flower stays with the Τζιμάνι badge, so this game needs a different image.** The grill's job here is not "which flower" but "what else is Leksokipos": the **centre-letter constraint** (every word must use it — the one rule no other game has), the garden, the rank ladder. This is the hardest of the eight, because its most obvious image is spent. |
| **Leksiarxeio** ✏️ | Wordle for Greek: 4–8 letter lengths, 6 guesses, per-letter feedback tiles (correct / present / absent). | ✏️ says *writing*; the game is *guessing*. The honest image is a tile row — and it wants the feedback tokens, not the accent (see Q1). Also the only game with a **length switcher**, so "a row of N tiles" begs which N. |
| **Vres Tin Frasi** 💬 | Guess the daily Greek phrase, 2–9 words, 6 guesses; the guess pool is fixed word-length lists 1–8. | 💬 is a speech bubble, which reads as chat, not as a phrase puzzle. Shares `purple-600` with Leksindeseis, which is out of scope now but returns at its flip (Q5). |
| **Leksodromia** 🏁 | Daily anagram sprint over 10 words. Score decays to a floor over 45s and is shown as a **draining bar, never a number**. | 🏁 says motor racing. Worse: s122 deliberately **removed the numeric timer** because players misread a points figure as a clock. **A stopwatch icon would re-introduce exactly the misreading that redesign removed.** The draining bar itself is the game's real visual signature. |
| **Leksoplegma** 🕸️ | Daily word-web: trace words along the edges of a letter grid; the board draws live SVG edges as you trace. | 🕸️ is a *spider's* web. The game is a node-and-edge graph — the right noun, the wrong picture. Closest of the eight to Topothesies in construction (both are SVG line art), so those two have to separate from each other. |
| **Topothesies** 🗺️ | Guess the Greek regional unit from its silhouette, then its capital. 109 answers, precomputed SVG paths, one silhouette per day inside a `border-4` frame. | The game **is** a silhouette on a card, so a map icon is nearly a screenshot. Also: a recognisable Greece outline at 16px is close to impossible — the shapes are simplified to 200m tolerance and still run 106–243 points. Its `blue-700` is one of the three blues. |
| **Stavrolekso** ♟️ | Community crossword browser **and** maker. Not dated, no leaderboard, no score. | ♟️ is a chess pawn — plainly wrong, and the clearest evidence the current emoji were never designed as a set. Its `sky-600` is a **placeholder accent** (Q1). It is also two things at once (browse + make), which no single icon has to solve but should be decided rather than ignored. |
| **Leksikastirio** ⚖️ | The community word-court: nominate words for addition or removal, vote, admin review. Explicitly **not a game**. | ⚖️ is the one current emoji that is genuinely apt. Worth asking whether it should be *drawn* rather than replaced. Its `indigo-600` is a **placeholder accent**, and it is the strongest case for Q3's "these two are not peers". |

---

## What the grill has to produce

A ticket in `.claude/tracker/tickets/`, which per `CLAUDE.md` needs all four of: a why, an explicit scope
checklist, a spec link, and a done-when. **Check the folder for the next free number before writing it** —
`TICKET-01` through `03` are spent and deleted, and `04`/`05` were filed on 2026-08-10 for Sound Cues.
Numbers are never reused. Concretely:

1. **A rendered spec page** at `.claude/aiHelper/html/game-icon-grill.html` — all eight at **both real sizes**
   (≈30px card, ≈16–20px drawer), on **both grounds** (theme-following card + the always-dark `zinc-900`
   panel), in **both themes**. Plus a **separation check**: the eight together, at the smallest size, as a
   set. That section is what caught problems last time; the question is not "is each one good" but "are
   these eight distinguishable from each other".

   **But the spec page is a mock, and the ticket's "done when" must not be satisfiable by it.**
   `reflections.md` carries this as a live tension from the badge work: the grill page is standalone HTML
   with its own CSS and hard-copied colours, so it reproduces a surface closely enough to *choose between
   options* and proves nothing about the real thing. Whoever builds this should render the real picker card
   and the real drawer early and look at them **before** finishing the drawings. Expect the busiest icon to
   be the one that breaks, and expect the drawer — 16–20px on dark — to break it first.
2. **Answers to Q1–Q5**, each recorded with the reason, so the ticket does not relitigate them.
3. **Exact values** — token names and their light/dark pairs, and the path data (or whatever Q4 lands),
   in the ticket, the way `TICKET-03` carried its eight hex values and five path strings.
4. **The `label` decision** — whether `GAME_REGISTRY.label` splits into `icon` + `name`, and what the Profile
   Page sentence renders afterwards.

## What this must not do

- **Must not touch `emoji` semantics elsewhere.** The rank ladder (`RANKS[].emoji`) and the share cards
  (Topothesies and Λογοπαίγνιο both copy emoji grids **on purpose** — `reflections.md` says do not "fix"
  them) are unrelated and stay. *(The 🚧 wip chip this list used to name no longer exists — `TICKET-06`
  deleted both it and the «Υπό κατασκευή» section outright on 2026-08-12, since a hidden Game is not
  signposted. Nothing to avoid there.)*
- **Must not change a game's identity, route, or registry id.** Renames are UI strings only, forever.
- **Must not quietly repaint a game's pages.** Deciding an icon colour that disagrees with `--game-accent`
  is allowed; changing `--game-accent` itself is a redesign decision that belongs to open question 2 of
  `docs/launch-runbook.md`, and if this grill wants to make it, it should say so out loud.
