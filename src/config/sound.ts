/**
 * Sound Cues — the Platform's Cue registry (ADR 0021).
 *
 * A Cue is a named sound-worthy moment. Cues are named for **the moment, not the
 * noise**, so replacing the rooster with something else later is a file swap, not
 * a rename that ripples through the selector, the tests and the config.
 *
 * Volumes are fixed per Cue and there is no volume slider: the Platform has no
 * other settings surface, and three sounds do not justify inventing one. The word
 * cue fires on nearly every submission, so it sits well below the rooster.
 */

/** Every Cue the Platform can play. Adding one is a row here + a selector branch. */
export type SoundCue = "pangram" | "wordFound" | "missingCenter";

/**
 * How a Cue makes its noise.
 *
 * `file` fetches an MP3 from `public/sounds/`. `synth` generates the sound in the
 * browser from one oscillator and ships **no asset at all** — no bytes to download,
 * no licence, no credit line, no Safari format question. A cue that is a plain
 * short blip is always cheaper synthesized than as a 30 KB recording of a blip;
 * anything with character (a rooster) has to be a file.
 *
 * The two `volume` fields are NOT the same scale and must not be compared:
 * `file` sets `HTMLAudioElement.volume`, `synth` sets a Web Audio gain. Tune each
 * kind by ear against the others rather than by matching the numbers.
 */
export type CueSound =
  | { kind: "file";  src: string; volume: number }
  /** `frequency` in Hz, `duration` in seconds — the whole envelope is fixed in the hook. */
  | { kind: "synth"; volume: number; frequency: number; duration: number };

/** localStorage key for the on/off preference — standalone, OUTSIDE the
 *  `wordgames:state` envelope, the same carve-out `theme-preference` has. */
export const SOUND_PREFERENCE_KEY = "sound-preference";

/*
 * ── File provenance ──────────────────────────────────────────────────────────
 * Filled in by TICKET-05, one line per file, so a future session can answer
 * "where did this come from" without git archaeology.
 *
 * The licence bar is **CC0, the Pixabay Content License, or the operator's own
 * recording**; CC-BY is refused
 * because it obliges a permanent credit line in the How-to-Play modal (which is
 * exactly why topothesies/attribution.ts exists). Record each file's ACTUAL
 * licence, not the licence of the site it came from — Freesound hosts CC0, CC-BY
 * and CC-BY-NC side by side, and Pixabay is NOT CC0 despite the common claim.
 *
 *   pangram.mp3        — "Rooster Crow 3" by BenjaminNelan
 *                        https://freesound.org/people/BenjaminNelan/sounds/435506/
 *                        licence: CC0 (licence page read 2026-08-17)
 *                        cut: -ss 0.445 -t 1.5 -ac 1 -b:a 64k from the 2.16 s source
 *
 *   missing-center.mp3 — "Applause Edited 2" by Sadiquecat
 *                        https://freesound.org/people/Sadiquecat/sounds/777708/
 *                        licence: CC0 (licence page read 2026-08-17)
 *                        cut: -ss 3.0 -t 1.5 -ac 1 -b:a 64k from the 15.7 s source
 *
 * The source WAVs stay in the gitignored public/sounds/_raw/ drop zone — 9 MB
 * together, and nothing in the build path reads them. Re-cutting either file means
 * downloading the source again from the URL above.
 *
 * `wordFound` has no row because it has no file: it is synthesized (see `CueSound`
 * below), so there is nothing to source, licence or credit. Two files remain.
 */

/**
 * Where each Cue's audio comes from, and how loud it plays.
 *
 * `as const satisfies` rather than a plain annotation: it checks every row against
 * `CueSound` while keeping each key's exact kind, so `SOUND_CUES.pangram.src`
 * still type-checks without narrowing the union at the call site.
 *
 * `wordFound` is the one synth Cue: a plain blip, so a recording of a blip would be
 * 30 KB and a licence for no gain. It fires on nearly every submission, so it stays
 * short and quiet — but higher and longer than a bare tick, because it is a small
 * reward and has to read as one rather than as keyboard feedback.
 */
export const SOUND_CUES = {
  pangram:       { kind: "file",  src: "/sounds/pangram.mp3",        volume: 0.7 },
  wordFound:     { kind: "synth", volume: 0.10, frequency: 1440, duration: 0.09 },
  missingCenter: { kind: "file",  src: "/sounds/missing-center.mp3", volume: 0.5 },
} as const satisfies Record<SoundCue, CueSound>;
