# ADR 0021 — Sound Cues

**Status:** accepted (2026-08-10) · **built 2026-08-11, not deployed** — see the 2026-08-11 amendment
**Tickets:** both are spent and both files are deleted per the tracker rule — `TICKET-04` (the primitive) shipped 2026-08-11, `TICKET-05` (the gate, then the assets) shipped 2026-08-17 and was closed 2026-08-18. Git history is the archive. The amendments below are dated and stay as written; where one says the ticket is open, read it as the state on its own date.

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
  nor overridable. Accepted, with no workaround. ⚠️ **The reasoning here is spent — see the
  2026-08-17 amendment.** It rejected Web Audio as "an entire second playback path"; that path now
  exists anyway, for a different reason, and it does **not** change this trap: Safari routes Web
  Audio through the same silent switch by default. What survives is the second half — every Cue is
  triggered by a tap or an Enter press, so the user-gesture requirement is satisfied naturally and
  **no separate "enable audio" priming step is needed**, for either playback path.
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

## Amendment (2026-08-15) — the deploy gate is replaced by a feature flag

**"Neither ticket ships alone" is spent, and no future session should re-impose it.** The Decision's
deploy gate was a correct rule with a human as its only enforcement — the third such rule in the
repo at the time, and the shape that had already failed here twice. It is now structural instead:
the 🔊 button renders only under `FEATURE_FLAGS.soundCues`, shipped **off**.

The hook, the preference and the Cue registry stay wired and inert — the same posture Offline Mode
took when it was parked (ADR 0010) — so flipping the flag on **restores the player's stored
choice** rather than resetting it. Consequence: sourcing the three MP3s is **post-launch and
optional**, blocking nothing. Cutting the feature no longer means reverting the toggle.

The operator phone-check that the previous amendment moved into `TICKET-05`'s done-when travels
with the flag flip, not with the files.

## Amendment (2026-08-17) — a Cue can be synthesized, and `wordFound` now is

**"The files are the other half" was true of three Cues and is now true of two.** A Cue no longer
has to be a file. `CueSound` in `src/config/sound.ts` is a two-member union — `file` (an MP3 in
`public/sounds/`, as before) and `synth` (one oscillator through a gain envelope, generated in the
browser) — and `useSoundCue` dispatches on the `kind`. Call sites are unchanged: `play(cue)` takes
a Cue name and nothing else, so which kind a Cue is stays a config fact.

`wordFound` moved to `synth` — a sine blip at 0.10 / 1440 Hz / 0.09 s, tuned by ear. The decision above described it as a
"short, quiet click", and a recording of a click costs 30 KB, a licence, a provenance line and a
format question to reproduce something twelve lines of Web Audio produce exactly. **Character is
the criterion**: a rooster cannot be synthesized and stays a file; a blip should never be one.
`public/sounds/` is down to two files, and `TICKET-05` is rewritten to match.

**A per-keystroke `keyPress` Cue was built the same day and cut before it shipped.** It worked —
keyed on the input growing, so it survived the keyboard path silently dropping letters that are
not in the puzzle — but it read as keyboard feedback rather than as a reward, and Cues here are
for *outcomes*. The Cue-per-moment vocabulary took it without complaint, which is the design
working: adding and removing a Cue was a registry row and one effect, exactly as claimed.

Two new traps, both about Web Audio rather than `HTMLAudioElement`:

- **jsdom implements no `AudioContext` at all** — neither `AudioContext` nor `webkitAudioContext`,
  confirmed by probe rather than assumed, which is now this ADR's third instance of that rule. So
  the hook guards on the constructor's presence and the tests **stub an absent API** rather than
  subclassing a real one as the Audio tests do. That is a weaker position than the Audio tests
  hold, and it is stated in both test files rather than papered over: the assertions pin the
  wiring, never the sound.
- **One `AudioContext` for the session, not one per play.** Browsers cap how many a page may open,
  so a context per Cue eventually stops working silently. The hook keeps one in a ref, mirroring
  the one-Audio-per-Cue rule above.

The two `volume` fields are **not the same scale** — `file` sets `HTMLAudioElement.volume`, `synth`
sets a Web Audio gain. Normalise the Cues against each other by ear; matching the numbers means
nothing.

## Amendment (2026-08-25) — one Cue is audible, and the other two are silenced rather than deleted

**The operator cut the Platform down to a single sound: `wordFound`, the blip on an accepted word.**
A Pangram now plays that same blip instead of the rooster, and `missing_center` joins the four
rejections in silence. The registry above still describes what a Cue *is* and what each one was for;
what changed is which moments reach it.

The whole change is `selectSoundCue`, which is now `result.status === "valid" ? "wordFound" : null`.
Everything else is untouched by choice — both other rows stay in `SOUND_CUES`, both MP3s stay in
`public/sounds/`, and the hook, the preference and the header toggle are exactly as they were. This
is a **silencing, not a removal**: restoring either sound is one line in this one pure function,
which is the cheapest reversal available and the reason deletion was declined.

That posture decides what the tests must assert. "The rooster is quiet" is too weak, because the
rooster is still registered, still shipped, and one edit away from playing. The property worth
holding is that **no file Cue is reachable at all**: `GameBoard.test.tsx` walks a whole round —
pangram, valid, missing-centre, not-in-list — and asserts no `HTMLMediaElement.play` ever happens
while sound is fully on. A player who never enables sound still downloads nothing, and a player who
does still downloads nothing, because no branch names either file.

One assertion in that test was written wrong first and is worth recording, since it is invisible on
a green run: `expect(arr).not.toContain(expect.stringContaining(x))` compares the **matcher object**
against the array's members, so it passes even when `x` is present. Spell such a check out —
`arr.some((s) => s.includes(x))` — or it asserts nothing at all.

**The two silenced Cues keep their provenance and licence lines in `src/config/sound.ts`.** They are
still shipped bytes, so the CC0 records stay accurate rather than being cleaned up as dead weight.

---

## Amendment (2026-08-26) — the toggle is removed, sound defaults ON, and the flag moves to playback

**Operator decision, ahead of a launch to a wider round of players: the 🔊 / 🔇 button leaves the
Shell header.** The reasoning is that a phone's own mute switch already governs one short blip, and
the button's real cost was the fourth control in a 320 px header — the layout risk `reflections.md`
has carried unpaid since the flag went on. The header is three buttons wide again.

Three consequences follow, and the middle one is the whole point of writing this down.

**The preference now defaults to ON.** «The preference» section above chose off-by-default because
unexpected audio is the web's most complained-about behaviour, and that reasoning was sound *while a
control existed*. Removing the button turns opt-in into a closed door: there is no in-app path to
"on" any more, so a default of off would mean the surviving Cue is unreachable by every player
forever — the feature deleted by accident rather than by decision. `readStored()` therefore reads
`!== "off"` rather than `=== "on"`, and the `useSyncExternalStore` server snapshot follows it to
`true`. **A stored `"off"` is still honoured**: the preference outlives its control, so a player who
muted before today stays muted, and re-adding the button restores their choice rather than resetting
it. `useSoundCue.test.ts` pins the default with a test that renders with **no stored key at all** —
every other test in that file writes the preference explicitly, so nothing else would notice a
revert to opt-in.

**`FEATURE_FLAGS.soundCues` moves from the button to `play()`.** The 2026-08-15 amendment introduced
it to gate the control; a flag that gates a control which no longer exists gates nothing. It now sits
at the top of `useSoundCue.play`, which makes it the Platform's **only** off switch for sound. That
is deliberate rather than incidental: with no player-facing control, one edit has to be able to
silence every Cue everywhere, without touching anyone's stored preference. Nothing is fetched and no
`AudioContext` is opened while it is down.

**What the Shell test now proves is an absence, in the shipped configuration.** The two old describe
blocks — "flag on" and "flag off" — are replaced by one that forces `soundCues` **true** and asserts
no button renders at either label. Testing the absence with the flag down would prove only that the
gate works; the fact worth holding is that the markup no longer contains the control while sound is
fully live. The same block counts the header's buttons, because a count is the only thing jsdom can
say about a layout concern that is really about width.
