export { autoNumberSlots } from "./autoNumberSlots";
export { isConnected } from "./isConnected";
export { normalizeAndCompare } from "./normalizeAndCompare";
export { getSlotLength, getSlotCells, makeBlackSet } from "./getSlotLength";
export { computeHighlightedCells, computeSolvedCells } from "./computeCells";
export { assembleSlots, restoreCellsFromSlots, clueKey } from "./makerSlots";
export { makerReducer, makeInitialMakerState, getSlots, isLetterKey } from "./makerReducer";
export type { MakerAction } from "./makerReducer";
export {
  EDIT_PIN_PATTERN,
  EDIT_PIN_ERROR,
  validateStavroleksoData,
  validateStavroleksoSubmission,
} from "./validateSubmission";
