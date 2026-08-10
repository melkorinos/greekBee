# Build the Sound Cue primitive, the header toggle, and the three Leksokipos cues

**Status:** ready
**Spec:** [docs/adr/0021-sound-cues.md](../../../docs/adr/0021-sound-cues.md)

## Why

The Platform has shipped eleven Games and has never made a sound — no audio in `src/`, no audio
dependency, `public/` holds only SVGs. Leksokipos has three moments with real emotional payload
that are currently silent: finding a Pangram, finding any valid Word, and being rejected for
forgetting the centre Letter. ADR 0021 settles every design question; this ticket is the build.

Everything here is buildable and fully testable **with no audio files present** — nothing asserts
audibility. `TICKET-05` sources the files in parallel. Neither blocks the other, but see
"Done when": **neither deploys alone.**

## Scope

### Config — `src/config/sound.ts` (new)

- [ ] `export type SoundCue = "pangram" | "wordFound" | "missingCenter"` — named for the moment,
      never the noise, so swapping the rooster later is a file replace.
- [ ] `SOUND_CUES: Record<SoundCue, { src: string; volume: number }>` pointing at
      `/sounds/pangram.mp3`, `/sounds/word-found.mp3`, `/sounds/missing-center.mp3`.
      Volumes fixed per cue, with the click clearly quieter than the rooster.
- [ ] A provenance comment block reserving a line per file for source URL + licence — `TICKET-05`
      fills it in.

### Pure selection — `src/games/leksokipos/lib/soundCue.ts` (new)

- [ ] `selectSoundCue(result: ValidationResult): SoundCue | null`. React-free, per the standing
      rule for `src/games/*/lib/`.
- [ ] `valid` + `isPangram` → `"pangram"`. `valid` alone → `"wordFound"`. **A Pangram never plays
      both** — one event, one cue.
- [ ] `missing_center` → `"missingCenter"`. The other four statuses (`not_in_list`,
      `already_found`, `too_short`, `invalid_letter`) → `null`, deliberately.

### Preference — `src/hooks/useSoundEnabled.ts` (new)

- [ ] Clone the `useTheme` shape: `useSyncExternalStore`, module-level listener set, `storage`
      event subscription for cross-tab.
- [ ] Key `sound-preference`, standalone in `localStorage`, **outside** the `wordgames:state`
      envelope — same carve-out as `theme-preference`. Do not route it through `useGameStore`.
- [ ] Server snapshot `false`, which is also the default, so no hydration mismatch.

### Playback — `src/hooks/useSoundCue.ts` (new)

- [ ] Returns `play(cue: SoundCue): void`.
- [ ] No-op when the preference is off — **nothing is fetched at all** for players who never
      enable sound.
- [ ] One `Audio` object per cue, created lazily on first play, kept in a ref map. Retrigger sets
      `currentTime = 0` then `play()`, so fast consecutive finds restart the click rather than
      stacking. Swallow the rejected `play()` promise; a blocked or missing file must never throw.

### Toggle — `src/components/shared/Shell.tsx`

- [ ] 🔊/🔇 button **inline in the header, immediately beside the ☀️/🌙 theme toggle**, written
      exactly like it (same `w-9 h-9 rounded-full` classes, `aria-label` in the theme toggle's
      style). Do **not** extract a component — the theme toggle is inline and this matches it.
- [ ] Renders on every page, including the ten Games with no cues. It is a Platform preference.
- [ ] **Not** a `GameCapability` — ADR 0020's criterion is what a Game does to the shared
      database, and a cue writes nothing. Do not touch `src/config/games.ts`.

### Wiring — `src/components/leksokipos/GameBoard.tsx`

- [ ] A `useEffect` keyed on `lastSubmission` that calls `selectSoundCue` and plays the result.
      The reducer stays untouched and emits nothing.

### Assets

- [ ] Create `public/sounds/` with a `.gitkeep` so the directory exists before `TICKET-05` lands.

### Docs

- [ ] `CONTEXT.md` glossary entry for **Cue**.

## Done when

- [ ] `selectSoundCue` is unit-tested across **all six** `ValidationStatus` values plus the
      pangram-beats-wordFound precedence. Grep `.claude/aiHelper/coverageMap.md` first — if a
      Leksokipos validation test file already covers this surface, extend it rather than adding one.
- [ ] A component test proves the effect plays when the preference is on and stays silent when it
      is off. `Shell.test.tsx` covers the toggle's presence and persistence.
- [ ] `HTMLMediaElement.prototype.play` is stubbed globally in `src/test/setup.ts`, guarded the
      same way the `scrollIntoView` stub is. jsdom does not implement it.
- [ ] `npm run test -- --run`, `npx eslint .`, `npm run build` all clean. Expect the documented
      `rlsInvariantsLiveDb` failures until the `player_milestones` migration is pushed — that
      count is not a regression.
- [ ] **`npm run test:e2e` run and green** — mandatory, this touches shared chrome on every page.
      If `/` fails with `Runtime SyntaxError: Unexpected end of JSON input`, clear `.next` first:
      that stale-chunk flake survives re-runs. Baseline is 7 passed / 2 skipped.
- [ ] `coverageMap.md` updated in the Dream.
- [ ] **Not deployed until `TICKET-05` is also closed.** A 🔊 toggle that plays silence is worse
      than no toggle.
