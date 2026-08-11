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
 * A Pangram plays the rooster **only** — never the rooster layered over the
 * click, which sounds like a bug. Four of the five rejections say nothing:
 * `not_in_list` is by far the most common, and taunting every mistyped word
 * turns hostile inside a minute.
 */
export function selectSoundCue(result: ValidationResult): SoundCue | null {
  if (result.status === "valid") return result.isPangram ? "pangram" : "wordFound";
  if (result.status === "missing_center") return "missingCenter";
  return null;
}
