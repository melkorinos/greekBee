// leksokiposSync.test.ts — direct test surface for the cross-device game_state
// wire (src/games/leksokipos/sync.ts). The hooks (useGameStateSync, useGameState)
// are thin callers over pushFoundWords / pullSnapshot.
//
// The pullSnapshot tests are the regression guard for the historical bug where,
// after a transfer-code sync, the player name came back but the found words did
// not — the pull was duplicated and could drift. There is now one pull.

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchLifetimeStats,
  postPangrams,
  pullSnapshot,
  pushFoundWords,
} from "@/games/leksokipos/sync";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";

const PUZZLE: LeksokiposPuzzle = {
  id:           "2026-01-01-el",
  language:     "el",
  date:         "2026-01-01",
  centerLetter: "α",
  outerLetters: ["π", "ι", "ν", "τ", "ε", "δ"],
  validWords:   ["αντι", "παιδ", "παιδι", "παιδια"],
};

function mockGet(foundWords: string[] | null) {
  const state = foundWords ? { foundWords } : null;
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok:   true,
    json: async () => ({ state }),
  } as Response);
}

afterEach(() => vi.restoreAllMocks());

// ── fetchLifetimeStats (points + pangram lanes read from ONE stats fetch) ─────────

describe("fetchLifetimeStats", () => {
  function mockStats(body: unknown, ok = true) {
    return vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok, json: async () => body,
    } as Response);
  }

  it("reads both leksokipos_points and pangram_count off the one response", async () => {
    const spy = mockStats({ leksokipos_points: 1500, pangram_count: 12, total_points: 9 });
    const stats = await fetchLifetimeStats("device-abc");
    expect(stats).toEqual({ leksokipos_points: 1500, pangram_count: 12 });
    const url = (spy.mock.calls[0] as [string])[0];
    expect(url).toContain("/api/profile/stats");
    expect(url).toContain("device_uuid=device-abc");
  });

  it("nulls out fields the response omits or that aren't numbers", async () => {
    mockStats({ total_points: 9 });
    expect(await fetchLifetimeStats("d")).toEqual({ leksokipos_points: null, pangram_count: null });
  });

  it("returns null on a non-ok response", async () => {
    mockStats({}, false);
    expect(await fetchLifetimeStats("d")).toBeNull();
  });

  it("returns null on a network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    expect(await fetchLifetimeStats("d")).toBeNull();
  });
});

// ── postPangrams (delta-post; returns the device's fresh lifetime count) ──────────

describe("postPangrams", () => {
  it("POSTs the pangram wire shape and returns the fresh count", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true, json: async () => ({ count: 11 }),
    } as Response);

    const count = await postPangrams({
      deviceUuid: "device-abc", puzzleDate: "2026-01-01", words: ["παρακολουθηση"],
    });

    expect(count).toBe(11);
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/pangrams");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      device_uuid: "device-abc",
      puzzle_date: "2026-01-01",
      words:       ["παρακολουθηση"],
    });
  });

  it("returns null on a non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, json: async () => ({}) } as Response);
    expect(await postPangrams({ deviceUuid: "d", puzzleDate: "2026-01-01", words: ["x"] })).toBeNull();
  });

  it("returns null (never throws) on a network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    await expect(
      postPangrams({ deviceUuid: "d", puzzleDate: "2026-01-01", words: ["x"] }),
    ).resolves.toBeNull();
  });
});

// ── push ────────────────────────────────────────────────────────────────────────

describe("pushFoundWords", () => {
  it("POSTs the leksokipos game_state wire shape", () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true, json: async () => ({ ok: true }),
    } as Response);

    pushFoundWords({ deviceUuid: "device-abc", puzzleDate: "2026-01-01", foundWords: ["αντι", "παιδι"] });

    expect(spy).toHaveBeenCalledOnce();
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/game-state");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      device_uuid: "device-abc",
      game_id:     "leksokipos",
      puzzle_date: "2026-01-01",
      state:       { foundWords: ["αντι", "παιδι"] },
    });
  });

  it("never throws when the network rejects", () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    expect(() =>
      pushFoundWords({ deviceUuid: "d", puzzleDate: "2026-01-01", foundWords: ["αντι"] }),
    ).not.toThrow();
  });
});

// ── pull (regression: found words must come back) ─────────────────────────────────

describe("pullSnapshot", () => {
  it("rebuilds a full snapshot with the found words and a recomputed score", async () => {
    mockGet(["αντι", "παιδι"]);

    const snap = await pullSnapshot({ deviceUuid: "device-abc", puzzleDate: "2026-01-01", puzzle: PUZZLE });

    expect(snap).not.toBeNull();
    expect(snap!.foundWords).toEqual(["αντι", "παιδι"]); // αντι (4) = 1pt, παιδι (5) = 5pt
    expect(snap!.score).toBe(6);
    expect(snap!.givenUp).toBe(false);
    expect(typeof snap!.currentRank).toBe("string");
  });

  it("requests the correct device, game, and date params", async () => {
    const spy = mockGet([]);
    await pullSnapshot({ deviceUuid: "device-abc", puzzleDate: "2026-01-01", puzzle: PUZZLE });

    const url = (spy.mock.calls[0] as [string])[0];
    expect(url).toContain("device_uuid=device-abc");
    expect(url).toContain("game_id=leksokipos");
    expect(url).toContain("puzzle_date=2026-01-01");
  });

  it("returns null when the server has an empty found-words list", async () => {
    mockGet([]);
    expect(await pullSnapshot({ deviceUuid: "d", puzzleDate: "2026-01-01", puzzle: PUZZLE })).toBeNull();
  });

  it("returns null when the server returns null state", async () => {
    mockGet(null);
    expect(await pullSnapshot({ deviceUuid: "d", puzzleDate: "2026-01-01", puzzle: PUZZLE })).toBeNull();
  });

  it("returns null on a network error (local state left untouched)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    expect(await pullSnapshot({ deviceUuid: "d", puzzleDate: "2026-01-01", puzzle: PUZZLE })).toBeNull();
  });
});
