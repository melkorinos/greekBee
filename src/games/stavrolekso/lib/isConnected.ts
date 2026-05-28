export function isConnected(
  width: number,
  height: number,
  blackSquares: [number, number][],
): boolean {
  const blackSet = new Set(blackSquares.map(([r, c]) => `${r}_${c}`));
  const isBlack = (r: number, c: number): boolean => blackSet.has(`${r}_${c}`);

  // Find first white cell
  let startR = -1;
  let startC = -1;
  outer: for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (!isBlack(r, c)) { startR = r; startC = c; break outer; }
    }
  }

  if (startR === -1) return true; // no white cells — vacuously connected

  const visited = new Set<string>([`${startR}_${startC}`]);
  const queue: [number, number][] = [[startR, startC]];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= height || nc < 0 || nc >= width) continue;
      if (isBlack(nr, nc)) continue;
      const key = `${nr}_${nc}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push([nr, nc]);
    }
  }

  const totalWhite = width * height - blackSquares.length;
  return visited.size === totalWhite;
}
