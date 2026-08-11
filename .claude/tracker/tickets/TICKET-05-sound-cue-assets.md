# Source and commit the three Sound Cue audio files

**Status:** ready
**Spec:** [docs/adr/0021-sound-cues.md](../../../docs/adr/0021-sound-cues.md)

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
- [ ] **Licence: CC0 or the Pixabay Content License only. CC-BY is refused** — it obliges a
      permanent credit line in the How-to-Play modal (the reason `topothesies/attribution.ts` and
      `posokanei/attribution.ts` exist), and three tiny sounds do not justify that. Using a CC-BY
      file without its credit is a breach, not a shortcut.
- [ ] **Record source URL + licence for each file** in the provenance comment block in
      `src/config/sound.ts`. Same discipline as the Λογοπαίγνιο manifest.
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

## Done when

- [ ] Three files in `public/sounds/`, each within its size and duration ceiling.
- [ ] Each file's source URL and licence recorded in `src/config/sound.ts`.
- [ ] All three heard in the running game, on a phone and on desktop, and judged not annoying.
- [ ] **While on the phone, look at the Shell header.** `TICKET-04` made it four buttons wide
      (👤 / ☀️🌙 / 🔊 / ☰) and **nothing guards that** — ADR 0021 named `mobileLayout.test.tsx`,
      which only renders `HowToPlayModal`, and jsdom has no layout engine, so a header that wraps
      or overflows at 320 px passes every gate. This eye-check is the only cover.
- [ ] `npm run build` clean.
- [ ] **This ticket is now the only thing between Sound Cues and a deploy.** `TICKET-04` shipped
      on 2026-08-11 (built, gated, merged into `dev`, **not deployed**) and its file is deleted per
      the tracker rule. The toggle, the hook and the three Leksokipos Cues are all live in code and
      currently play silence: the 🔊 button renders on every page today. Until these files land,
      the correct state is **merged and undeployed** — do not push `dev` to production.
