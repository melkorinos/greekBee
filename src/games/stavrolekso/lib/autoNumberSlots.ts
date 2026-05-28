import type { SlotDef } from "../types";

export function autoNumberSlots(
  width: number,
  height: number,
  blackSquares: [number, number][],
): SlotDef[] {
  const blackSet = new Set(blackSquares.map(([r, c]) => `${r}_${c}`));
  const isBlack = (r: number, c: number): boolean => blackSet.has(`${r}_${c}`);
  const isWhite = (r: number, c: number): boolean =>
    r >= 0 && r < height && c >= 0 && c < width && !isBlack(r, c);

  const slots: SlotDef[] = [];
  let num = 1;

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (isBlack(r, c)) continue;

      // Starts Across: left boundary + at least 2 more white cells to the right (total ≥ 3)
      const startsAcross =
        (c === 0 || isBlack(r, c - 1)) && isWhite(r, c + 1) && isWhite(r, c + 2);

      // Starts Down: top boundary + at least 2 more white cells below (total ≥ 3)
      const startsDown =
        (r === 0 || isBlack(r - 1, c)) && isWhite(r + 1, c) && isWhite(r + 2, c);

      if (!startsAcross && !startsDown) continue;

      if (startsAcross) {
        slots.push({ number: num, direction: "across", startRow: r, startCol: c, answer: "", clue: "" });
      }
      if (startsDown) {
        slots.push({ number: num, direction: "down", startRow: r, startCol: c, answer: "", clue: "" });
      }
      num++;
    }
  }

  return slots;
}
