// Leksodromia — deterministic word scramble (pure, no React).
// Fisher-Yates seeded from (seed, word) so every player sees the same shuffle
// on a date. The result is never the identity order — re-drawn from the same
// PRNG stream until it differs (impossible only when all letters are equal,
// in which case the word is returned unchanged).

import { hashSeed, mulberry32 } from "./seededRandom";

const MAX_RESHUFFLES = 20;

export function scrambleWord(word: string, seed: string): string {
  const letters = [...word];
  // All letters identical → identity is the only permutation.
  if (new Set(letters).size <= 1) return word;

  const rand = mulberry32(hashSeed(`leksodromia-scramble:${seed}:${word}`));

  for (let attempt = 0; attempt < MAX_RESHUFFLES; attempt++) {
    const shuffled = [...letters];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const result = shuffled.join("");
    if (result !== word) return result;
  }

  // Deterministic fallback: rotate by one — differs whenever letters differ.
  return word.slice(1) + word[0];
}
