// Vres Tin Frasi — scoring (in-game display only).
// Same formula as Leksiarxeio: 6 pts for 1 guess → 1 pt for 6 guesses, 0 if lost.

export function scoreVresTinFrasi(attempts: number, won: boolean): number {
  if (!won) return 0;
  return Math.max(1, 7 - attempts);
}
