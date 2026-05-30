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

/**
 * Returns the player's saved display name, or empty string if not set.
 * Always returns empty string on the server.
 */
export function getDisplayName(): string {
  if (typeof window === "undefined") return "";
  return readEnvelope()["displayName"] ?? "";
}

/**
 * Persists the player's display name in the unified localStorage envelope.
 */
export function setDisplayName(name: string): void {
  const envelope = readEnvelope();
  writeEnvelope({ ...envelope, displayName: name.trim() });
}

// ── Cross-device profile ─────────────────────────────────────────────────────
// profileLinked = true means this device has an active cross-device profile.
// When active, deviceId doubles as the profile's device_uuid — the same UUID
// is used for both leaderboard identity and game-state sync.

/** Returns true if this device has an active cross-device profile. */
export function isProfileLinked(): boolean {
  if (typeof window === "undefined") return false;
  return readEnvelope()["profileLinked"] === true;
}

/** Set or clear the profileLinked flag. */
export function setProfileLinked(value: boolean): void {
  const envelope = readEnvelope();
  writeEnvelope({ ...envelope, profileLinked: value });
}

/**
 * Overwrite the deviceId. Used during profile transfer — the source device's
 * device_uuid becomes this device's identity for both leaderboard and sync.
 */
export function setDeviceId(id: string): void {
  const envelope = readEnvelope();
  writeEnvelope({ ...envelope, deviceId: id });
}

/**
 * One-time migration for existing Leksiarxeio players.
 * Before the device-identity unification, Leksiarxeio stored its own identity
 * in a "leksiarxeio-identity" slice separate from the platform deviceId.
 * If this device has that legacy slice but no unified deviceId yet, this function
 * promotes the legacy identity to the unified envelope fields.
 * Safe to call repeatedly — no-op once the unified deviceId exists.
 */
export function migrateLeksiarxeioIdentity(): void {
  if (typeof window === "undefined") return;
  const envelope = readEnvelope();
  if (envelope["deviceId"]) return;
  const legacy = envelope["leksiarxeio-identity"] as { deviceId?: string; displayName?: string } | undefined;
  if (!legacy?.deviceId) return;
  writeEnvelope({
    ...envelope,
    deviceId:    legacy.deviceId,
    displayName: envelope["displayName"] ?? legacy.displayName ?? "",
  });
}

/**
 * Unlink the cross-device profile from this device.
 * Generates a fresh anonymous deviceId so the player can continue anonymously.
 */
export function disconnectProfile(): void {
  const envelope = readEnvelope();
  writeEnvelope({ ...envelope, deviceId: crypto.randomUUID(), profileLinked: false, authLinked: false });
}

// ── Google auth identity ─────────────────────────────────────────────────────
// authLinked = true means this device's profile is linked to a Google account.
// AuthLinked always implies ProfileLinked (sign-in creates or merges a profile).

/** Returns true if this device is linked to a Google account. */
export function isAuthLinked(): boolean {
  if (typeof window === "undefined") return false;
  return readEnvelope()["authLinked"] === true;
}

/** Set or clear the authLinked flag. */
export function setAuthLinked(value: boolean): void {
  const envelope = readEnvelope();
  writeEnvelope({ ...envelope, authLinked: value });
}

