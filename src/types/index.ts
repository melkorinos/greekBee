// Platform-wide TypeScript types.
// Game-specific types live in src/games/<game>/types.ts.

// ─── Language ────────────────────────────────────────────────────────────────

/** Supported game languages. */
export type Language = "el";

// ─── Platform ────────────────────────────────────────────────────────────────

/** All games hosted on this platform. */
export type GameId = "spelling-bee" | "wordle" | "connections" | "suggestions";

// ── Persistence ───────────────────────────────────────────────────────────────

/**
 * Top-level localStorage envelope.
 * Each game reads/writes only its own slice — cross-game access is not possible
 * through the typed API exposed by useGameStore.
 * Slice types are intentionally loose here (unknown) and narrowed per-game.
 */
export interface PersistenceEnvelope {
  "spelling-bee"?:  unknown;
  "wordle"?:        unknown;
  "connections"?:   unknown;
  /** Words already suggested by this device — string[] of normalised words. */
  "suggestions"?:   unknown;
  /** Stable anonymous device identifier (UUID v4). Shared across all games. */
  "deviceId"?:      string;
}
