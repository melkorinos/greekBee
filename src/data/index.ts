// Puzzle data access layer — re-exports from game-scoped loaders.
// Import directly from "@/data/leksokipos" for Leksokipos puzzles.

export {
  getPuzzleForDate,
  getTodaysPuzzle,
  getPuzzleById,
  getRandomPuzzle,
  getNextPuzzle,
  buildCustomPuzzle,
  getPrebuiltPuzzleByLetters,
} from "./leksokipos/index";
