// Which Sound Cue a submission earns (ADR 0021) — pure, React-free.
//
// The reducer is untouched and emits nothing: GameBoard runs this over
// `lastSubmission` and plays whatever comes back. That keeps the rule
// unit-testable without a browser and confines Audio to one effect.

import type { SoundCue } from "@/config/sound";
import type { ValidationResult } from "../types";

/**
 * The Cue for one submission, or null when the moment is deliberately silent.
 *
 * ONE CUE IS AUDIBLE: `wordFound`, the blip on an accepted word — the sound of a
 * submission landing. Every other moment is silent by operator decision
 * (2026-08-25), including the two that used to have a voice:
 *
 *   - a Pangram plays `wordFound` like any other accepted word, NOT the rooster;
 *   - `missing_center` says nothing, like the other four rejections.
 *
 * The rows for `pangram` and `missingCenter` stay in `src/config/sound.ts` and
 * their MP3s stay in `public/sounds/` — this is a deliberately reversible
 * silencing, not a removal, so restoring either is editing this function alone.
 * Nothing downloads those files while no branch here names them.
 *
 * The four rejections were already silent for a reason worth keeping: `not_in_list`
 * is by far the most common, and taunting every mistyped word turns hostile inside
 * a minute.
 */
export function selectSoundCue(result: ValidationResult): SoundCue | null {
  return result.status === "valid" ? "wordFound" : null;
}
