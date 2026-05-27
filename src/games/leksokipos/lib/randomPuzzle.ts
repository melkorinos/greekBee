// randomPuzzle.ts — random Leksokipos Puzzle generation with quality rules.
//
// Quality rules for a valid random Puzzle:
//   - Center letter is always a vowel (ensures more Valid Words can be formed).
//   - At least 1 additional vowel among the 6 outer letters (≥ 2 vowels total).
//   - At least 2 consonants among the 6 outer letters — avoids all-vowel grids.

export const GREEK_VOWELS = new Set(["α", "ε", "η", "ι", "ο", "υ", "ω"]);

// All 24 modern Greek lowercase letters used in Leksokipos puzzles.
const PUZZLE_LETTERS = [
  "α", "β", "γ", "δ", "ε", "ζ", "η", "θ",
  "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π",
  "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Picks 7 unique random Greek letters that meet the quality rules above.
 *
 * Implementation: pick center from vowels, guarantee 1 extra vowel + 2
 * consonants in the outer ring, fill the remaining 3 slots randomly, then
 * shuffle the outer ring so the guaranteed letters are not always first.
 */
export function pickRandom7(): { center: string; outer: string[] } {
  const vowelPool     = PUZZLE_LETTERS.filter((l) =>  GREEK_VOWELS.has(l));
  const center        = shuffle(vowelPool)[0];

  const remaining           = PUZZLE_LETTERS.filter((l) => l !== center);
  const remainingVowels     = remaining.filter((l) =>  GREEK_VOWELS.has(l));
  const remainingConsonants = remaining.filter((l) => !GREEK_VOWELS.has(l));

  const [extraVowel, ...restVowels]       = shuffle(remainingVowels);
  const [cons1, cons2, ...restConsonants] = shuffle(remainingConsonants);

  const filler = shuffle([...restVowels, ...restConsonants]).slice(0, 3);
  const outer  = shuffle([extraVowel, cons1, cons2, ...filler]);

  return { center, outer };
}
