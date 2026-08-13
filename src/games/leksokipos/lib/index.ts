// Pure game-logic helpers for Leksokipos (validation, scoring, ranking).
// These are plain functions with no React dependency — easy to unit test.
// Import from "@/games/leksokipos/lib" to get everything in one shot.

export { validateWord } from "./validation";
export { scoreWord, maxScore, computeScoreFromWords } from "./scoring";
export { isPangram } from "./pangram";
export { computeEndgameInfo, getRemainingWords } from "./endgame";
export type { EndgameInfo } from "./endgame";
export { calculateRank, RANKS, getRankEmoji, TOP_RANK } from "./ranking";
export { normalizeLetters } from "./normalize";
export { isDailyPuzzle } from "./puzzle";
export { reconcileSnapshot, buildSnapshotFromWords } from "./reconcile";
export { pickRandom7, GREEK_VOWELS } from "./randomPuzzle";
