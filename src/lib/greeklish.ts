// greeklish.ts — bijective Latin ↔ Greek single-character transliteration.
//
// Used to produce clean ASCII URLs for the custom Spelling Bee route so that
// shared links look readable and do not contain percent-encoded multi-byte
// sequences (Greek code points each encode as 4 ASCII characters in a URL).
//
// Design constraint: 1 English letter → 1 Greek letter, no digraphs.
// Parsing is therefore unambiguous — no look-ahead, no greedy matching needed.
//
// Mapping rationale
// -----------------
//   a-z assignments follow standard greeklish where intuitive:
//     a→α  b→β  g→γ  d→δ  e→ε  z→ζ  h→η  i→ι  k→κ  l→λ  m→μ
//     n→ν  o→ο  p→π  r→ρ  s→σ  t→τ  u→υ  f→φ  w→ω
//   The four "awkward" letters have no standard single-char assignment:
//     χ → x  (standard greeklish; obvious)
//     θ → q  (q is otherwise unmapped; th digraph would collide with t+h)
//     ξ → j  (j is otherwise unmapped; ks digraph would collide with k+s)
//     ψ → c  (c is otherwise unmapped; ps digraph would collide with p+s)
//   v, y — intentionally unmapped (Greek has no equivalent phoneme).

/** Maps every greeklish Latin letter to its Greek equivalent. */
export const GREEKLISH_TO_GREEK: Record<string, string> = {
  a: "α",
  b: "β",
  g: "γ",
  d: "δ",
  e: "ε",
  z: "ζ",
  h: "η",
  q: "θ",
  i: "ι",
  k: "κ",
  l: "λ",
  m: "μ",
  n: "ν",
  j: "ξ",
  o: "ο",
  p: "π",
  r: "ρ",
  s: "σ",
  t: "τ",
  u: "υ",
  f: "φ",
  x: "χ",
  c: "ψ",
  w: "ω",
};

/** Maps every Greek letter to its greeklish Latin equivalent (inverse of above). */
export const GREEK_TO_GREEKLISH: Record<string, string> = Object.fromEntries(
  Object.entries(GREEKLISH_TO_GREEK).map(([latin, greek]) => [greek, latin]),
);

/**
 * Converts a string of normalised Greek letters to their greeklish (Latin)
 * equivalents. Characters not in the map are passed through unchanged.
 */
export function greekToGreeklish(text: string): string {
  return [...text].map((ch) => GREEK_TO_GREEKLISH[ch] ?? ch).join("");
}

/**
 * Converts a string of greeklish (Latin) letters to their Greek equivalents.
 * Characters not in the map are passed through unchanged.
 */
export function greeklishToGreek(text: string): string {
  return [...text].map((ch) => GREEKLISH_TO_GREEK[ch] ?? ch).join("");
}

/**
 * Returns true if every character in the string is a valid greeklish letter —
 * i.e. a lowercase ASCII letter that has a Greek mapping.
 * An empty string returns false.
 */
export function isGreeklish(text: string): boolean {
  return text.length > 0 && [...text].every((ch) => ch in GREEKLISH_TO_GREEK);
}
