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

/** localStorage key for the on/off preference — standalone, OUTSIDE the
 *  `wordgames:state` envelope, the same carve-out `theme-preference` has. */
export const SOUND_PREFERENCE_KEY = "sound-preference";

/*
 * ── File provenance ──────────────────────────────────────────────────────────
 * Filled in by TICKET-05, one line per file, so a future session can answer
 * "where did this come from" without git archaeology.
 *
 * The licence bar is **CC0 or the Pixabay Content License**; CC-BY is refused
 * because it obliges a permanent credit line in the How-to-Play modal (which is
 * exactly why topothesies/attribution.ts exists). Record each file's ACTUAL
 * licence, not the licence of the site it came from — Freesound hosts CC0, CC-BY
 * and CC-BY-NC side by side, and Pixabay is NOT CC0 despite the common claim.
 *
 *   pangram.mp3        — source: <url>   licence: <CC0 | Pixabay Content License>
 *   word-found.mp3     — source: <url>   licence: <CC0 | Pixabay Content License>
 *   missing-center.mp3 — source: <url>   licence: <CC0 | Pixabay Content License>
 */

/** Where each Cue's audio lives, and how loud it plays. */
export const SOUND_CUES: Record<SoundCue, { src: string; volume: number }> = {
  pangram:       { src: "/sounds/pangram.mp3",        volume: 0.7 },
  wordFound:     { src: "/sounds/word-found.mp3",     volume: 0.2 },
  missingCenter: { src: "/sounds/missing-center.mp3", volume: 0.5 },
};
