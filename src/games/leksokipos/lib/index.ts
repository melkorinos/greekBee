// Pure game-logic helpers for Leksokipos (validation, scoring, ranking).
// These are plain functions with no React dependency — easy to unit test.
// Import from "@/games/leksokipos/lib" to get everything in one shot.

export { validateWord } from "./validation";
export { scoreWord, maxScore, computeScoreFromWords } from "./scoring";
export { isPangram } from "./pangram";
export { calculateRank, RANKS, getRankEmoji, TOP_RANK } from "./ranking";
export { normalizeLetters } from "./normalize";
export { isDailyPuzzle, isISODate } from "./puzzle";
export { pickRandom7, GREEK_VOWELS } from "./randomPuzzle";
