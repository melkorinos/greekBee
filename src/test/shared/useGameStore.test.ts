// useGameStore.test.ts — unit tests for the unified localStorage envelope.
// Verifies slice isolation, read/write/clear semantics, and the legacy key migration.
// No React — plain Vitest + jsdom (localStorage is available via setup.ts).

import {
  clearSlice,
  disconnectProfile,
  getDisplayName,
  getOrCreateDeviceId,
  isProfileLinked,
  migrateLeksiarxeioIdentity,
  readSlice,
  setDeviceId,
  setDisplayName,
  setProfileLinked,
  writeSlice,
} from "@/hooks/useGameStore";
import { describe, expect, it } from "vitest";

// ── helpers ───────────────────────────────────────────────────────────────────

function rawEnvelope() {
  const raw = localStorage.getItem("wordgames:state");
  return raw ? JSON.parse(raw) : null;
}

// setup.ts already calls localStorage.clear() before each test — nothing extra needed.

// ── readSlice ─────────────────────────────────────────────────────────────────

describe("readSlice", () => {
  it("returns null when nothing has been written", () => {
    expect(readSlice("leksokipos")).toBeNull();
  });

  it("returns null for an untouched game even after another game is written", () => {
    writeSlice("leksokipos", { score: 10 });
    expect(readSlice("leksiarxeio")).toBeNull();
  });

  it("returns the value that was written", () => {
    writeSlice("leksokipos", { score: 42, foundWords: ["αλφα"] });
    expect(readSlice("leksokipos")).toEqual({ score: 42, foundWords: ["αλφα"] });
  });
});

// ── writeSlice ────────────────────────────────────────────────────────────────

describe("writeSlice", () => {
  it("writes into the wordgames:state envelope", () => {
    writeSlice("leksokipos", { score: 5 });
    const env = rawEnvelope();
    expect(env).not.toBeNull();
    expect(env["leksokipos"]).toEqual({ score: 5 });
  });

  it("does not overwrite another game's slice when writing", () => {
    writeSlice("leksokipos", { score: 1 });
    writeSlice("leksindeseis", { solved: true });

    const env = rawEnvelope();
    // Both slices present and independent
    expect(env["leksokipos"]).toEqual({ score: 1 });
    expect(env["leksindeseis"]).toEqual({ solved: true });
  });

  it("overwrites only the target slice on a second write", () => {
    writeSlice("leksokipos", { score: 1 });
    writeSlice("leksiarxeio",       { streak: 3 });
    writeSlice("leksokipos", { score: 99 }); // second write to leksokipos

    const env = rawEnvelope();
    expect(env["leksokipos"]).toEqual({ score: 99 }); // updated
    expect(env["leksiarxeio"]).toEqual({ streak: 3 });        // untouched
  });
});

// ── clearSlice ────────────────────────────────────────────────────────────────

describe("clearSlice", () => {
  it("removes only the target game slice", () => {
    writeSlice("leksokipos", { score: 10 });
    writeSlice("leksiarxeio",       { streak: 2 });

    clearSlice("leksokipos");

    const env = rawEnvelope();
    expect(env["leksokipos"]).toBeUndefined();
    expect(env["leksiarxeio"]).toEqual({ streak: 2 }); // unaffected
  });

  it("does nothing when the slice does not exist", () => {
    writeSlice("leksiarxeio", { streak: 1 });
    clearSlice("leksokipos"); // not written — should not throw

    expect(readSlice("leksokipos")).toBeNull();
    expect(readSlice("leksiarxeio")).toEqual({ streak: 1 });
  });

  it("readSlice returns null after clearSlice", () => {
    writeSlice("leksindeseis", { done: true });
    clearSlice("leksindeseis");
    expect(readSlice("leksindeseis")).toBeNull();
  });
});


// ── getOrCreateDeviceId ────────────────────────────────────────────────────────

describe("getOrCreateDeviceId", () => {
  it("returns a non-empty string", () => {
    expect(getOrCreateDeviceId()).not.toBe("");
  });

  it("returns a valid UUID v4 format", () => {
    const id = getOrCreateDeviceId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("returns the same value on subsequent calls (stable identity)", () => {
    const first  = getOrCreateDeviceId();
    const second = getOrCreateDeviceId();
    expect(first).toBe(second);
  });

  it("persists the id in the wordgames:state envelope under deviceId", () => {
    const id = getOrCreateDeviceId();
    const raw = localStorage.getItem("wordgames:state");
    const envelope = JSON.parse(raw!);
    expect(envelope.deviceId).toBe(id);
  });

  it("does not overwrite an existing deviceId", () => {
    // Pre-seed a known id (simulates a returning user)
    const existing = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    localStorage.setItem("wordgames:state", JSON.stringify({ deviceId: existing }));
    expect(getOrCreateDeviceId()).toBe(existing);
  });

  it("generating a new id does not wipe other slices", () => {
    writeSlice("leksokipos", { score: 42 });
    getOrCreateDeviceId();
    expect(readSlice("leksokipos")).toEqual({ score: 42 });
  });
});

// ── getDisplayName / setDisplayName ───────────────────────────────────────────

describe("getDisplayName", () => {
  it("returns empty string when nothing has been saved", () => {
    expect(getDisplayName()).toBe("");
  });

  it("returns the name after setDisplayName has been called", () => {
    setDisplayName("Νίκος");
    expect(getDisplayName()).toBe("Νίκος");
  });

  it("trims whitespace when saving", () => {
    setDisplayName("  Μαρία  ");
    expect(getDisplayName()).toBe("Μαρία");
  });
});

describe("setDisplayName", () => {
  it("persists the name under displayName in the envelope", () => {
    setDisplayName("Αλέξης");
    const raw = localStorage.getItem("wordgames:state");
    const envelope = JSON.parse(raw!);
    expect(envelope.displayName).toBe("Αλέξης");
  });

  it("does not overwrite other slices when saving a name", () => {
    writeSlice("leksokipos", { score: 7 });
    setDisplayName("Κώστας");
    expect(readSlice("leksokipos")).toEqual({ score: 7 });
  });

  it("overwrites a previously saved name", () => {
    setDisplayName("Πρώτο");
    setDisplayName("Δεύτερο");
    expect(getDisplayName()).toBe("Δεύτερο");
  });
});

// ── Cross-device profile helpers ──────────────────────────────────────────────

describe("isProfileLinked / setProfileLinked", () => {
  it("returns false when nothing has been set", () => {
    expect(isProfileLinked()).toBe(false);
  });

  it("returns true after setProfileLinked(true)", () => {
    setProfileLinked(true);
    expect(isProfileLinked()).toBe(true);
  });

  it("returns false after setProfileLinked(false)", () => {
    setProfileLinked(true);
    setProfileLinked(false);
    expect(isProfileLinked()).toBe(false);
  });

  it("persists under profileLinked in the envelope", () => {
    setProfileLinked(true);
    const envelope = JSON.parse(localStorage.getItem("wordgames:state")!);
    expect(envelope.profileLinked).toBe(true);
  });

  it("does not disturb other slices", () => {
    writeSlice("leksokipos", { score: 3 });
    setProfileLinked(true);
    expect(readSlice("leksokipos")).toEqual({ score: 3 });
  });
});

describe("setDeviceId", () => {
  it("overwrites the deviceId in the envelope", () => {
    getOrCreateDeviceId(); // ensure a UUID exists first
    setDeviceId("aaaaaaaa-bbbb-4ccc-8ddd-ffffffffffff");
    expect(getOrCreateDeviceId()).toBe("aaaaaaaa-bbbb-4ccc-8ddd-ffffffffffff");
  });

  it("does not disturb other slices", () => {
    writeSlice("leksokipos", { score: 5 });
    setDeviceId("new-id");
    expect(readSlice("leksokipos")).toEqual({ score: 5 });
  });
});

// ── migrateLeksiarxeioIdentity ────────────────────────────────────────────────

describe("migrateLeksiarxeioIdentity", () => {
  const LEGACY_ID = "11111111-2222-4333-8444-555555555555";

  it("is a no-op when unified deviceId already exists", () => {
    const existing = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    localStorage.setItem("wordgames:state", JSON.stringify({ deviceId: existing }));
    migrateLeksiarxeioIdentity();
    const envelope = JSON.parse(localStorage.getItem("wordgames:state")!);
    expect(envelope.deviceId).toBe(existing);
  });

  it("promotes leksiarxeio-identity.deviceId to unified deviceId", () => {
    localStorage.setItem("wordgames:state", JSON.stringify({
      "leksiarxeio-identity": { deviceId: LEGACY_ID, displayName: "" },
    }));
    migrateLeksiarxeioIdentity();
    const envelope = JSON.parse(localStorage.getItem("wordgames:state")!);
    expect(envelope.deviceId).toBe(LEGACY_ID);
  });

  it("migrates displayName from legacy slice when no unified displayName exists", () => {
    localStorage.setItem("wordgames:state", JSON.stringify({
      "leksiarxeio-identity": { deviceId: LEGACY_ID, displayName: "Νίκος" },
    }));
    migrateLeksiarxeioIdentity();
    const envelope = JSON.parse(localStorage.getItem("wordgames:state")!);
    expect(envelope.displayName).toBe("Νίκος");
  });

  it("does not overwrite a pre-existing unified displayName", () => {
    localStorage.setItem("wordgames:state", JSON.stringify({
      displayName: "Κώστας",
      "leksiarxeio-identity": { deviceId: LEGACY_ID, displayName: "Νίκος" },
    }));
    migrateLeksiarxeioIdentity();
    const envelope = JSON.parse(localStorage.getItem("wordgames:state")!);
    expect(envelope.displayName).toBe("Κώστας");
  });

  it("is a no-op when no legacy identity exists at all", () => {
    localStorage.setItem("wordgames:state", JSON.stringify({ "leksiarxeio": {} }));
    migrateLeksiarxeioIdentity();
    const envelope = JSON.parse(localStorage.getItem("wordgames:state")!);
    expect(envelope.deviceId).toBeUndefined();
  });

  it("does not disturb existing game slices", () => {
    const gameData = { "2026-05-25-wordle-5": { status: "won" } };
    localStorage.setItem("wordgames:state", JSON.stringify({
      "leksiarxeio": gameData,
      "leksiarxeio-identity": { deviceId: LEGACY_ID, displayName: "" },
    }));
    migrateLeksiarxeioIdentity();
    const envelope = JSON.parse(localStorage.getItem("wordgames:state")!);
    expect(envelope["leksiarxeio"]).toEqual(gameData);
  });
});

describe("disconnectProfile", () => {
  it("generates a new deviceId different from the one before", () => {
    const before = getOrCreateDeviceId();
    disconnectProfile();
    const after = getOrCreateDeviceId();
    expect(after).not.toBe(before);
  });

  it("new deviceId is a valid UUID v4", () => {
    disconnectProfile();
    const id = getOrCreateDeviceId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("clears profileLinked", () => {
    setProfileLinked(true);
    disconnectProfile();
    expect(isProfileLinked()).toBe(false);
  });

  it("does not disturb game slices", () => {
    writeSlice("leksokipos", { score: 8 });
    disconnectProfile();
    expect(readSlice("leksokipos")).toEqual({ score: 8 });
  });
});
