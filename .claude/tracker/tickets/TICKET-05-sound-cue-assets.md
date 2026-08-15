# Gate the sound toggle, then source the three Sound Cue audio files

**Status:** ready
**Spec:** [docs/adr/0021-sound-cues.md](../../../docs/adr/0021-sound-cues.md)

**Retargeted 2026-08-15 — this ticket no longer blocks the deploy.** The operator ruled the three
MP3s **post-launch and optional**: the calendar for launch does not wait on someone listening to
roosters. That splits the ticket in two, and the halves have different owners and different dates.

- **Part A — pre-launch, agent, one small change.** Hide the 🔊 toggle behind a feature flag so the
  Platform does not ship a visible control that does nothing. This is the only launch-blocking half.
- **Part B — post-launch, operator, no date.** Source the files, then flip the flag. Everything
  below *Why* is Part B and is unchanged apart from the removed deploy block at the end.

## Part A — gate the toggle behind a feature flag (pre-launch) — ✅ DONE 2026-08-15

Shipped: `soundCues: false` in `src/config/featureFlags.ts`, the button wrapped in
`{FEATURE_FLAGS.soundCues && …}` in `src/components/shared/Shell.tsx`, and two blocks in
`src/test/shared/Shell.test.tsx` — the existing sound tests now turn the flag on themselves, and a
new block owns the shipped default (no button, hamburger closes the gap, stored preference
untouched). The flag is mocked as a mutable `vi.hoisted` object; reuse it rather than adding a
second mock. 2611 tests, eslint, build and the Playwright suite all green.

**The scope below is kept for the record. Part B is the live half.**

`TICKET-04` merged the whole Sound Cue machine into `dev`, and `src/components/shared/Shell.tsx`
renders the 🔊 / 🔇 button on **every page** (around line 129, the sibling of the theme toggle).
With `public/sounds/` empty, that button toggles a preference that produces silence either way. A
control that visibly does nothing is worse than an absent one, and a soft launch is exactly the
audience that will press it.

### Scope

- [x] Add `soundCues: boolean` to `FeatureFlags` in `src/config/featureFlags.ts`, set to `false`,
      documented in the same style as the `achievements` flag — including the note that flipping it
      on requires the three MP3s to exist first.
- [x] Gate the toggle button in `Shell.tsx` on that flag. Gate the **button only** — `useSoundCue`,
      `useSoundEnabled` and the stored preference stay wired and inert, exactly as Offline Mode was
      parked. Nothing else in the machine is touched.
- [x] A test asserting the button is absent while the flag is off. Follow whatever the achievements
      flag already does; check `coverageMap.md` before creating a new file.
- [x] Header width note: gating this button takes the Shell header from four buttons to three, which
      **relieves** the 320 px crowding flagged in Part B's done-when. The eye-check moves to Part B.

### Done when

- [x] The 🔊 button does not render anywhere with the flag off; flipping the flag to `true` brings it
      back with no other edit.
- [x] `npm run test -- --run`, `npx eslint .`, `npm run build` clean, plus `npm run test:e2e` —
      this touches shared chrome, which is precisely the case the standing rule names.

## Part B — the three audio files (post-launch, operator)

## Current state (re-checked 2026-08-15, after Part A)

- `public/sounds/` exists and holds **only `.gitkeep`** — zero audio files. Committed empty by
  `cade542` alongside the `TICKET-04` machine.
- `src/config/sound.ts` is untouched: the three `SOUND_CUES` rows wired to `/sounds/pangram.mp3`,
  `/sounds/word-found.mp3`, `/sounds/missing-center.mp3` with volumes 0.7 / 0.2 / 0.5, plus the
  provenance comment block with all three `<url>` placeholders still waiting.
- `FEATURE_FLAGS.soundCues` is `false` (`a88aa4c`), so the 🔊 button renders nowhere and the header
  is three buttons wide today. The hook and the stored preference are still wired and inert.
- **`/tdd` is the wrong command for this ticket.** There is no logic left to drive test-first —
  `TICKET-04` already built the machine and Part A gated it, and no test in this stack can assert
  that a sound is audible. The remaining work is sourcing, listening, and two comment blocks.

## Why

`TICKET-04` builds the whole Sound Cue machine and can be fully tested without a single audio
file, because nothing in this stack can assert that a sound is audible. The files are the other
half, and they are **operator work, not agent work**: this repo's experience with automated asset
sourcing is that it returns confident nonsense (s130 — Commons matched ΔΕΗ to "Namibia Power
Corporation" and ΣΤΑΣΥ to a Lithuanian choir), and nobody can eye-check a sound. Three files have
to be listened to by a human.

Neither ticket blocks the other's implementation. Neither ships without the other.

## Scope

- [ ] Source three files and commit them to `public/sounds/`:

  | File | Cue | Character | Ceiling |
  |---|---|---|---|
  | `pangram.mp3` | Pangram found | rooster crow — the reward | ≤ 1.5 s |
  | `word-found.mp3` | valid Word found | minimal click — barely there | ≤ 120 ms |
  | `missing-center.mp3` | forgot the centre Letter | sarcastic slow clap | ≤ 1.5 s |

- [ ] **Format: MP3, mono, ≤ 30 KB each.** MP3 plays everywhere including Safari; OGG does not.
- [ ] **Normalised relative to each other** — the click must be clearly quieter than the rooster.
      Fine-tune afterwards with the per-cue `volume` in `src/config/sound.ts` rather than
      re-encoding.
- [ ] **Licence: CC0, the Pixabay Content License, or the operator's own recording. CC-BY is
      refused** — it obliges a
      permanent credit line in the How-to-Play modal (the reason `topothesies/attribution.ts` and
      `posokanei/attribution.ts` exist), and three tiny sounds do not justify that. Using a CC-BY
      file without its credit is a breach, not a shortcut.
- [ ] **Record source URL + licence for each file** in the provenance comment block in
      `src/config/sound.ts`. Same discipline as the Λογοπαίγνιο manifest.
- [ ] **Widen that block's stated licence bar while you are in there.** It currently reads
      `<CC0 | Pixabay Content License>` on all three lines and predates the own-recording option
      below; add the operator's own recording as a third accepted value so the file and this ticket
      stop disagreeing.
- [ ] Listen to all three **in the running game**, on a phone as well as desktop, before closing.

## Sourcing notes

- **[Freesound](https://freesound.org) with the licence filter set to Creative Commons 0** is the
  primary source. Confirmed to carry usable CC0 applause —
  [Sadiquecat](https://freesound.org/people/Sadiquecat/sounds/806753/),
  [Breviceps](https://freesound.org/people/Breviceps/sounds/462362/). Its best-known rooster
  ([InspectorJ 384188](https://freesound.org/people/InspectorJ/sounds/384188/)) is **CC-BY, not
  CC0** — do not use it.
- **[Pixabay](https://pixabay.com/sound-effects/)** is deep on UI clicks and requires no
  attribution, but is **not CC0** — it is the Pixabay Content License, which forbids redistributing
  content "on a standalone basis". An MP3 bundled inside a Game is not standalone distribution, so
  it clears the bar; record it as Pixabay, never as CC0.
- **Self-recorded audio is allowed and is the cleanest option of the three.** The operator owns the
  recording outright, so the licence question disappears: record it as
  `licence: own recording (operator), <date>` in the provenance block. It suits all three cues —
  the slow clap is literally two hands, the click can be a fingernail on a desk, and a phone voice
  memo of a real rooster is fine. Constraints are unchanged: mono, MP3, within the size and
  duration ceilings, and normalised against each other. Convert with
  `ffmpeg -i in.wav -ac 1 -b:a 64k -t 1.5 out.mp3` (drop `-t` for the click and trim instead).
  Watch for room noise and clipping — a quiet hiss under the click is more annoying at every
  submission than the click itself.

## Done when

- [ ] Three files in `public/sounds/`, each within its size and duration ceiling.
- [ ] Each file's source URL and licence recorded in `src/config/sound.ts` (the three `<url>`
      placeholders in the provenance block are gone). Self-recorded files record the date instead
      of a URL.
- [ ] `public/sounds/.gitkeep` deleted — the real files now hold the folder open.
- [ ] All three heard in the running game, on a phone and on desktop, and judged not annoying.
- [ ] **While on the phone, look at the Shell header** — *after* flipping the flag, since that is
      the moment it goes back to four buttons wide (👤 / ☀️🌙 / 🔊 / ☰). **Nothing guards that
      width** — ADR 0021 named `mobileLayout.test.tsx`, which only renders `HowToPlayModal`, and
      jsdom has no layout engine, so a header that wraps or overflows at 320 px passes every gate.
      This eye-check is the only cover, and Part A is what deferred it to here.
- [ ] `npm run build` clean.
- [ ] **`FEATURE_FLAGS.soundCues` flipped to `true`** in the same branch as the files. Part A's flag
      is what makes Part B shippable on its own schedule, and the flip is the last step, not the
      first — flipping before the files exist restores the silent button.

**This no longer blocks a deploy.** `TICKET-04` shipped on 2026-08-11 (built, gated, merged into
`dev`, **not deployed**) and its file is deleted per the tracker rule. With Part A done, `dev` is
free to go to production carrying the whole Sound Cue machine dark. The old instruction here — *do
not push `dev` to production until these files land* — was withdrawn by the operator on 2026-08-15
and is recorded in `launch-readiness.md`.
