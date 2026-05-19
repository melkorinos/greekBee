// Puzzle data access layer — re-exports from game-scoped loaders.
// Import directly from "@/data/spelling-bee" for Spelling Bee puzzles.
// This barrel exists so existing @/data imports don't break during migration.

export {
  getPuzzleForDate,
  getTodaysPuzzle,
  getPuzzleById,
  getRandomPuzzle,
  getNextPuzzle,
  buildCustomPuzzle,
  getCuratedPuzzleByLetters,
  getRecentPuzzleDates,
} from "./spelling-bee/index";
