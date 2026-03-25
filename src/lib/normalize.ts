// normalizeLetters — normalises text for puzzle letter comparison.
//
// Greek players type without accents (αλλο not άλλο), but the dictionary
// stores accented forms. We strip all combining diacritics via NFD so both
// sides of every comparison are accent-free, massively increasing the number
// of words that validate successfully.
//
// Also collapses Greek final sigma ς → σ since the puzzle letter set only
// stores the base form.

/**
 * Normalises a string for puzzle letter comparison:
 *  - Lowercases everything
 *  - Decomposes accented characters (NFD) then strips combining diacritics
 *    so accented (ά, έ, ό …) and unaccented (α, ε, ο …) forms are equivalent
 *  - Replaces Greek final sigma ς (U+03C2) with regular sigma σ (U+03C3)
 */
export function normalizeLetters(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")                   // ά → α + combining accent
    .replace(/[\u0300-\u036f]/g, "")    // strip all combining diacritical marks
    .replace(/ς/g, "σ");               // final sigma → regular sigma
}
