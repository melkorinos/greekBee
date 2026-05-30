// Platform-wide TypeScript types.
// Game-specific types live in src/games/<game>/types.ts.

// ─── Language ────────────────────────────────────────────────────────────────

/** Supported game languages. */
export type Language = "el";

// ─── Platform ────────────────────────────────────────────────────────────────

/** All games hosted on this platform. */
export type GameId = "leksokipos" | "leksiarxeio" | "leksindeseis" | "vrestifrasi" | "suggestions" | "reports";

// ── Persistence ───────────────────────────────────────────────────────────────

/**
 * Top-level localStorage envelope.
 * Each game reads/writes only its own slice — cross-game access is not possible
 * through the typed API exposed by useGameStore.
 * Slice types are intentionally loose here (unknown) and narrowed per-game.
 */
export interface PersistenceEnvelope {
  "leksokipos"?:           unknown;
  "leksiarxeio"?:          unknown;
  "leksiarxeio-identity"?: unknown;
  "leksindeseis"?:         unknown;
  "vrestifrasi"?:          unknown;
  /** Words already suggested by this device — string[] of normalised words. */
  "suggestions"?:          unknown;
  /** Words already flagged for removal by this device — string[] of normalised words. */
  "reports"?:              unknown;
  /** Stable anonymous device identifier (UUID v4). Shared across all games. */
  "deviceId"?:             string;
  /** Player's chosen display name for leaderboards. */
  "displayName"?:          string;
  /** True once a cross-device profile has been created or claimed via transfer code. */
  "profileLinked"?:        boolean;
  /** True when this device's profile is linked to a Google account (AuthLinked). */
  "authLinked"?:           boolean;
}
