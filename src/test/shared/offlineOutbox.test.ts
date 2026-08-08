// offlineOutbox.test.ts — the Offline Score Outbox (ADR 0010).
//
// The outbox is a localStorage record keyed by (gameId, puzzleDate), overwriting
// per key. It is NOT an append queue: game_scores upserts by
// (device_id, game_id, puzzle_date), so only the latest score per key matters.
//
// These tests own the two rules the handoff calls out as bug-prone:
// keyed overwrite (a second game must not discard the first game's pending score)
// and keep-on-failure (a failed flush must never lose the score it exists to protect).

import { describe, expect, it, vi } from "vitest";

import {
  clearOutboxEntry,
  flushOutbox,
  outboxKey,
  readOutbox,
  setOutboxDisplayName,
  writeOutboxEntry,
} from "@/lib/offlineOutbox";

// ── Fixtures ────────────────────────────────────────────────────────────────

const KIPOS = {
  gameId:      "leksokipos",
  puzzleDate:  "2026-08-03",
  deviceId:    "device-1",
  score:       42,
  displayName: "Μαρία",
} as const;

const DROMIA = {
  gameId:      "leksodromia",
  puzzleDate:  "2026-08-03",
  deviceId:    "device-1",
  score:       17,
  displayName: "Μαρία",
} as const;

// ── Keyed overwrite ─────────────────────────────────────────────────────────

describe("outbox — keyed overwrite", () => {
  it("returns an empty list when nothing has been queued", () => {
    expect(readOutbox()).toEqual([]);
  });

  it("stores a queued entry", () => {
    writeOutboxEntry(KIPOS);
    expect(readOutbox()).toEqual([KIPOS]);
  });

  it("overwrites the entry for the same (gameId, puzzleDate) instead of appending", () => {
    writeOutboxEntry(KIPOS);
    writeOutboxEntry({ ...KIPOS, score: 99 });

    const entries = readOutbox();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.score).toBe(99);
  });

  it("keeps a second game's score alongside the first — the regression the key exists to prevent", () => {
    writeOutboxEntry(KIPOS);
    writeOutboxEntry(DROMIA);

    const entries = readOutbox();
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.gameId).sort()).toEqual(["leksodromia", "leksokipos"]);
  });

  it("treats the same game on a different puzzle date as a separate entry", () => {
    writeOutboxEntry(KIPOS);
    writeOutboxEntry({ ...KIPOS, puzzleDate: "2026-08-04", score: 5 });

    expect(readOutbox()).toHaveLength(2);
  });

  it("keys an entry by gameId and puzzleDate", () => {
    expect(outboxKey(KIPOS)).toBe("leksokipos:2026-08-03");
  });

  it("clears only the named entry", () => {
    writeOutboxEntry(KIPOS);
    writeOutboxEntry(DROMIA);

    clearOutboxEntry(KIPOS);

    expect(readOutbox().map((e) => e.gameId)).toEqual(["leksodromia"]);
  });

  it("survives a corrupt stored payload by reporting an empty outbox", () => {
    localStorage.setItem("wordgames:offline-outbox", "{not json");
    expect(readOutbox()).toEqual([]);
  });
});

// ── Name saves ──────────────────────────────────────────────────────────────

describe("outbox — name saves while offline", () => {
  it("overwrites displayName on every pending entry", () => {
    writeOutboxEntry(KIPOS);
    writeOutboxEntry(DROMIA);

    setOutboxDisplayName("Γιώργος");

    expect(readOutbox().map((e) => e.displayName)).toEqual(["Γιώργος", "Γιώργος"]);
  });

  it("is a no-op when the outbox is empty", () => {
    setOutboxDisplayName("Γιώργος");
    expect(readOutbox()).toEqual([]);
  });
});

// ── Flush ───────────────────────────────────────────────────────────────────

describe("outbox — flush", () => {
  it("posts each pending entry and clears them on success", async () => {
    writeOutboxEntry(KIPOS);
    writeOutboxEntry(DROMIA);
    const post = vi.fn().mockResolvedValue(true);

    const result = await flushOutbox(post);

    expect(post).toHaveBeenCalledTimes(2);
    expect(readOutbox()).toEqual([]);
    expect(result).toEqual({ flushed: 2, kept: 0 });
  });

  it("posts the wire body game_scores expects", async () => {
    writeOutboxEntry(KIPOS);
    const post = vi.fn().mockResolvedValue(true);

    await flushOutbox(post);

    expect(post).toHaveBeenCalledWith("/api/game-scores", {
      game_id:      "leksokipos",
      puzzle_date:  "2026-08-03",
      device_id:    "device-1",
      score:        42,
      display_name: "Μαρία",
    });
  });

  it("KEEPS an entry whose post failed, so the score is retried on the next deactivate", async () => {
    writeOutboxEntry(KIPOS);
    const post = vi.fn().mockResolvedValue(false);

    const result = await flushOutbox(post);

    expect(readOutbox()).toEqual([KIPOS]);
    expect(result).toEqual({ flushed: 0, kept: 1 });
  });

  it("clears the entries that succeeded and keeps only the ones that failed", async () => {
    writeOutboxEntry(KIPOS);
    writeOutboxEntry(DROMIA);
    const post = vi
      .fn()
      .mockImplementation((_url: string, body: { game_id: string }) =>
        Promise.resolve(body.game_id === "leksokipos"),
      );

    const result = await flushOutbox(post);

    expect(readOutbox().map((e) => e.gameId)).toEqual(["leksodromia"]);
    expect(result).toEqual({ flushed: 1, kept: 1 });
  });

  it("keeps the entry when the post throws rather than resolving false", async () => {
    writeOutboxEntry(KIPOS);
    const post = vi.fn().mockRejectedValue(new Error("network down"));

    const result = await flushOutbox(post);

    expect(readOutbox()).toEqual([KIPOS]);
    expect(result).toEqual({ flushed: 0, kept: 1 });
  });

  it("does not post anything when the outbox is empty", async () => {
    const post = vi.fn().mockResolvedValue(true);

    const result = await flushOutbox(post);

    expect(post).not.toHaveBeenCalled();
    expect(result).toEqual({ flushed: 0, kept: 0 });
  });

  it("does not clobber an entry queued while the flush was in flight", async () => {
    writeOutboxEntry(KIPOS);
    const post = vi.fn().mockImplementation(async () => {
      // A word found mid-flush raises the pending score for the same key.
      writeOutboxEntry({ ...KIPOS, score: 500 });
      return true;
    });

    await flushOutbox(post);

    expect(readOutbox()).toEqual([{ ...KIPOS, score: 500 }]);
  });
});
