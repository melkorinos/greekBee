// Pure game-logic helpers (validation, scoring, ranking).
// These are plain functions with no React dependency — easy to unit test.
// Import from "@/lib" to get everything in one shot.

export { validateWord } from "./validation";
export { scoreWord, maxScore } from "./scoring";
export { isPangram } from "./pangram";
export { calculateRank, RANKS } from "./ranking";
