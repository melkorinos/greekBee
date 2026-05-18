// useGameStore — unified localStorage envelope for all games.
// The single key "wordgames:state" holds a typed envelope object.
// Each game reads/writes only its own named slice via readSlice/writeSlice.
// Cross-game leakage is structurally impossible: each caller provides its own
// slice type T and only that slice is read or written.

import type { GameId, PersistenceEnvelope } from "@/types";

const STORE_KEY = "wordgames:state";

/** Read the full envelope from localStorage. Returns {} on failure. */
function readEnvelope(): PersistenceEnvelope {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PersistenceEnvelope;
  } catch {
    return {};
  }
}

/** Write the full envelope back to localStorage. Silently swallows errors. */
function writeEnvelope(envelope: PersistenceEnvelope): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(envelope));
  } catch {
    // localStorage unavailable (private browsing, storage full) — game still works
  }
}

/**
 * Read a game's persisted slice.
 * Returns null if nothing has been saved yet or the data is corrupt.
 */
export function readSlice<T>(gameId: GameId): T | null {
  const envelope = readEnvelope();
  const slice = envelope[gameId];
  return slice !== undefined ? (slice as T) : null;
}

/**
 * Write a game's persisted slice.
 * Merges the slice into the envelope — other games' data is untouched.
 */
export function writeSlice<T>(gameId: GameId, data: T): void {
  const envelope = readEnvelope();
  writeEnvelope({ ...envelope, [gameId]: data });
}

/**
 * Clear a single game's persisted slice.
 * Other games' slices are unaffected.
 */
export function clearSlice(gameId: GameId): void {
  const envelope = readEnvelope();
  const updated = { ...envelope };
  delete updated[gameId];
  writeEnvelope(updated);
}

// ── Device identity ─────────────────────────────────────────────────────────
// A stable anonymous UUID stored in the unified envelope.
// Shared by all features that need a consistent per-device identity
// (word suggestions, future leaderboard).

/**
 * Returns this device's UUID, creating and persisting one on first call.
 * Always returns an empty string on the server (localStorage unavailable).
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  const envelope = readEnvelope();
  if (envelope["deviceId"]) return envelope["deviceId"]!;
  const id = crypto.randomUUID();
  writeEnvelope({ ...envelope, deviceId: id });
  return id;
}

// ── One-time migration ────────────────────────────────────────────────────────
// If the old "spelling-bee:state" key exists (from before the unified store),
// migrate it into the new envelope and delete the old key.

export function migrateFromLegacyKeys(): void {
  try {
    const legacyKey = "spelling-bee:state";
    const legacy = localStorage.getItem(legacyKey);
    if (!legacy) return;

    const envelope = readEnvelope();
    // Only migrate if there's no current spelling-bee slice yet
    if (!envelope["spelling-bee"]) {
      const parsed = JSON.parse(legacy);
      writeEnvelope({ ...envelope, "spelling-bee": parsed });
    }
    localStorage.removeItem(legacyKey);
  } catch {
    // Corrupt legacy data — just delete it
    try { localStorage.removeItem("spelling-bee:state"); } catch { /* ignore */ }
  }
}
