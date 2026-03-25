// normalizeGreek — converts final sigma (ς) to regular sigma (σ) before
// any letter comparison. This is required because Greek text uses two
// forms of sigma: σ (mid-word) and ς (end-of-word), but the puzzle
// only stores the base form σ in its letter set.
// All other characters are lowercased (covers Latin too).

/**
 * Normalises a string for puzzle letter comparison:
 *  - Lowercases everything
 *  - Replaces Greek final sigma ς (U+03C2) with regular sigma σ (U+03C3)
 */
export function normalizeLetters(text: string): string {
  return text.toLowerCase().replace(/ς/g, "σ");
}
