# ADR 0021 — Sound Cues

**Status:** accepted (2026-08-10) · **built 2026-08-11, not deployed** — see the 2026-08-11 amendment
**Tickets:** [TICKET-05-sound-cue-assets.md](../../.claude/tracker/tickets/TICKET-05-sound-cue-assets.md) (open — the three MP3s). `TICKET-04` (the primitive) shipped 2026-08-11 and its file is deleted per the tracker rule; git history is the archive.

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
  layout at narrow widths. ⚠️ **`mobileLayout.test.tsx` is NOT a guard for this** — corrected
  2026-08-11; it holds HowToPlayModal overflow contracts only and never renders the header. No
  test in this repo can guard it either: jsdom has no layout. See the amendment below.
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
  ⚠️ **This trap is stated wrongly — see the 2026-08-11 amendment.** The stub is needed; the
  mechanism described here does not work and the return value is not what it implies.
- **No test can assert that a sound is audible.** Nothing in this stack can. The tests assert which
  Cue is selected and whether `play` was called; the sound itself is checked by ear, once, by a
  human.
- **Neither ticket ships alone.** A 🔊 toggle that plays silence is worse than no toggle, so the
  deploy gate is both tickets closed — even though neither blocks the other's implementation.

## Amendment (2026-08-11) — the jsdom trap was stated wrongly, in the way that matters

`TICKET-04` is built and merged. Every decision above survived implementation unchanged; the one
thing that did not was a **trap**, and it failed at precisely the point traps are supposed to help.

The original line — *"jsdom does not implement `HTMLMediaElement.play`, alongside the
`scrollIntoView` stub added in s123 for the same reason"* — is wrong twice:

- **jsdom defines `play()`.** It is a real function on the prototype that logs
  `Not implemented: HTMLMediaElement's play() method` to the virtual console. So the guarded form
  the analogy invites, `if (!HTMLMediaElement.prototype.play) { … }`, **never fires** and the stub
  is dead code. `scrollIntoView` is genuinely absent, which is the only reason that guard works
  there. The stub in `src/test/setup.ts` is therefore an **unconditional assignment**, and it must
  stay one.
- **jsdom's `play()` returns `undefined`, not a Promise.** The trap said the promise needed
  swallowing, which implies there is always a promise to swallow. `audio.play().catch(() => {})`
  is a `TypeError` on jsdom, and on older Safari, which returns nothing either. The shipped call is
  `audio.play()?.catch(() => {})` and `useSoundCue.test.ts` pins the `undefined` return in a test of
  its own, separately from the rejection case.

Both were found by a ten-second probe test, and neither would have been found by reading. The
generalisable half is recorded in `reflections.md`: this repo has now been bitten four times by a
claim about someone else's runtime (s130 Commons metadata, s132 `router.prefetch` returning `void`,
s139 a feature flag's documented value, and this), and **twice specifically by a void return
described as a Promise**. A mechanism copied from a real precedent in this codebase is not thereby
verified — the precedent was real and the analogy was still false.

Consequence for the test suite: `useSoundCue.test.ts` subclasses the **real** `Audio` and spies on
the prototype rather than substituting a fake Audio class. A hand-rolled mock is a claim about the
browser's contract, and the claim is what has been wrong every previous time.

**A second claim in this ADR was also false, found the same way.** The consequence above cited
`mobileLayout.test.tsx` as the existing guard for the header going from three buttons to four. That
file renders `HowToPlayModal` and nothing else; it has never touched the Shell. Worse, **no test
here can cover it** — jsdom has no layout engine, so a header that wraps or overflows at 320 px is
green in every suite. This is the s144 rule again (*for anything whose failure mode is "looks
wrong", the suite locks decisions and cannot prove results*), and the honest mitigation is a human
on a phone: the check is added to `TICKET-05`'s done-when, which already puts the operator on a
phone with this feature.

Nothing about the design changes. `SOUND_CUES` shipped with volumes 0.7 / 0.2 / 0.5 (rooster, click,
slow clap), and `TICKET-05` remains open, which means **the toggle currently renders on every page
and plays silence** — the deploy gate above is now the only thing enforcing that, and it is live
rather than hypothetical.
