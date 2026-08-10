# ADR 0021 — Sound Cues

**Status:** accepted (2026-08-10)
**Tickets:** `.claude/tracker/tickets/TICKET-04-sound-cue-primitive.md`, `TICKET-05-sound-cue-assets.md`

## Context

The Platform has shipped eleven Games and has never made a sound. There is no audio anywhere in
`src/`, no audio dependency in `package.json`, and `public/` holds only SVGs. Leksokipos in
particular has three moments with real emotional payload that are currently silent: finding a
Pangram, finding any valid Word, and being rejected for forgetting the centre Letter.

`ValidationStatus` already names all six submission outcomes, and `GameState.lastSubmission` is a
fresh object on every submit that is deliberately **not** persisted — so an event source for cues
already exists and needs nothing new in the reducer.

The design question was never "can we play a sound". It was: how much machinery does three sounds
justify, who owns the audio files legally, and what happens on a phone with the ringer off.

## Decision

### The vocabulary

A **Cue** is a named sound-worthy moment. Three exist:

| Cue | Fires on | Intended sound |
|---|---|---|
| `pangram` | a valid submission that is a Pangram | rooster crow |
| `wordFound` | a valid submission that is not a Pangram | short, quiet click |
| `missingCenter` | a rejection with status `missing_center` | sarcastic slow clap |

Cues are named for **the moment, not the noise**, so replacing the rooster later is a file swap,
not a rename. The other four rejection statuses (`not_in_list`, `already_found`, `too_short`,
`invalid_letter`) are **deliberately silent** — `not_in_list` is by far the most common rejection,
and taunting every mistyped word turns hostile inside a minute.

### The seam

**One Cue per event, chosen by one pure function.** `selectSoundCue(result: ValidationResult):
SoundCue | null` lives in `src/games/leksokipos/lib/` and is React-free. A Pangram plays the
rooster **only** — never the rooster layered over the click, which sounds like a bug.

The reducer is untouched and emits nothing. A `useEffect` keyed on `lastSubmission` in `GameBoard`
calls the selector and plays the result. This keeps the rule unit-testable without a browser and
confines `Audio` to three lines in a component.

### The preference

**Off by default, opt-in.** Unexpected audio on a public site is the most-complained-about
behaviour on the web, and mobile browsers block the first play anyway, so on-by-default is both
unreliable and rude.

The toggle is a 🔊/🔇 button in the Shell header **beside the ☀️/🌙 theme toggle**, inline in
`Shell.tsx` exactly as the theme toggle is — the icon itself is the discoverability mechanism, so
no separate onboarding hint is needed. It renders on **every** page even though only Leksokipos
has Cues today: it is a Platform preference like theme, and hiding it per-route would force the
Shell to know which Games make noise.

The value lives under `localStorage["sound-preference"]`, standalone and **outside** the
`wordgames:state` envelope — the same carve-out `theme-preference` and `leksokipos-variant`
already have, read through a `useSyncExternalStore` hook cloned from `useTheme` so it survives
multiple tabs. Server snapshot is `false`, which is also the default, so there is no hydration
mismatch by construction.

**Not** a `GameCapability` (ADR 0020). That ADR's criterion for "behaviour enrols" is explicitly
*what a Game does to the shared database*; a Cue writes nothing, costs nothing, and creates no
permanent rows — it sits with the things ADR 0020 names as presentation. Declaring `sound` would
mean eleven registry edits to express "only Leksokipos", which `src/config/sound.ts` already says
in one place.

### The playback mechanics

**One `Audio` object per Cue, created lazily on first play and only while sound is on.** Retrigger
sets `currentTime = 0` and replays, so three fast finds restart the click rather than stacking
three of them. Nothing is downloaded at all for the players who never enable sound.

Paths and a fixed per-Cue volume live in **`src/config/sound.ts`** (standing rule: never hardcode
a value that lives in `src/config/`). There is **no volume slider** — the Platform has no other
settings surface and three sounds do not justify inventing one.

### The licensing bar

**CC0 or the Pixabay Content License. CC-BY is refused.** Both accepted licences require no credit
line, which is the entire point: `topothesies/attribution.ts` and `posokanei/attribution.ts` exist
because ODbL and CC-BY *oblige* a permanent line in the How-to-Play modal, and three tiny sounds
are not worth that. A CC-BY file used without its credit is a licence breach, not a shortcut.

Freesound's CC0 filter is the primary source and was confirmed to carry usable material. Pixabay
is acceptable despite forbidding redistribution "on a standalone basis" — an MP3 bundled inside a
Game is not standalone distribution.

**Provenance is not optional:** the source URL and licence of each file are recorded in a comment
block in `src/config/sound.ts`, so a future session can answer "where did this come from" without
git archaeology. This is the same discipline as the Λογοπαίγνιο manifest.

The operator sources the files. Automated asset sourcing is confidently wrong in this repo's
experience (s130: Commons matched ΔΕΗ to Namibia Power), and nobody can eye-check a sound.

## Consequences

- The primitive is Platform-shaped from day one — a hook plus a registry, not three sounds wired
  into one Game. This does not violate the "nothing graduates to `shared/` speculatively" rule: a
  hook is not a component, and the toggle has to live in the Shell either way. Adding a fourth Cue
  later is a registry row and a selector branch.
- The Shell header goes from three buttons to four on mobile (👤 / theme / 🔊 / ☰). Watch the
  layout at narrow widths; `mobileLayout.test.tsx` is the existing guard.
- Rank-up, Genius, and round-completion Cues were considered and **deliberately excluded from v1**.
  A rank-up chime competing with an achievement toast is a tuning problem not worth opening before
  launch. The registry makes it a one-line change when it is.
- This is pre-launch work but **does not block launch**. The launch checklist is itself still an
  open question in `.claude/handoffs/launch-readiness.md`, and adding a hard gate to a list that
  does not yet exist is how launches slip. Cut it without ceremony if the files do not arrive.

## Traps

- **iOS mutes HTML5 audio when the physical silent switch is on**, and this is neither detectable
  nor overridable. Accepted, with no workaround: the Web Audio escape hatch costs an entire second
  playback path for a case the player deliberately asked for. Every Cue is triggered by a tap or an
  Enter press, so the browser's user-gesture requirement is satisfied naturally and **no separate
  "enable audio" priming step is needed**.
- **jsdom does not implement `HTMLMediaElement.play`** — it needs a global stub in
  `src/test/setup.ts`, alongside the `scrollIntoView` stub added in s123 for the same reason.
- **No test can assert that a sound is audible.** Nothing in this stack can. The tests assert which
  Cue is selected and whether `play` was called; the sound itself is checked by ear, once, by a
  human.
- **Neither ticket ships alone.** A 🔊 toggle that plays silence is worse than no toggle, so the
  deploy gate is both tickets closed — even though neither blocks the other's implementation.
