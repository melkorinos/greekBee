// postScore.test.ts — sanitizeDisplayName: trims and falls back to "Ανώνυμος".
// Also covers postScoreAwaitable, the async sibling the Offline Score Outbox
// flush needs: postScore is fire-and-forget and returns void, so a flush routed
// through it could not tell success from failure and would clear the outbox on a
// failed post — losing the exact Score the feature exists to protect (ADR 0010).

import { afterEach, describe, expect, it, vi } from "vitest";

import { postScoreAwaitable, sanitizeDisplayName } from "@/lib/postScore";

describe("sanitizeDisplayName", () => {
  it("returns the name as-is when it is already clean", () => {
    expect(sanitizeDisplayName("Μαρία")).toBe("Μαρία");
  });

  it("trims leading and trailing whitespace", () => {
    expect(sanitizeDisplayName("  Μαρία  ")).toBe("Μαρία");
  });

  it("falls back to Ανώνυμος for an empty string", () => {
    expect(sanitizeDisplayName("")).toBe("Ανώνυμος");
  });

  it("falls back to Ανώνυμος for whitespace-only input", () => {
    expect(sanitizeDisplayName("   ")).toBe("Ανώνυμος");
  });

  it("falls back to Ανώνυμος for null", () => {
    expect(sanitizeDisplayName(null)).toBe("Ανώνυμος");
  });

  it("falls back to Ανώνυμος for undefined", () => {
    expect(sanitizeDisplayName(undefined)).toBe("Ανώνυμος");
  });
});

describe("postScoreAwaitable", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves true when the server accepts the post", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    await expect(postScoreAwaitable("/api/game-scores", { score: 1 })).resolves.toBe(true);
  });

  it("resolves false on a non-ok response instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(postScoreAwaitable("/api/game-scores", { score: 1 })).resolves.toBe(false);
  });

  it("resolves false when the network rejects — the offline case", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(postScoreAwaitable("/api/game-scores", { score: 1 })).resolves.toBe(false);
  });

  it("sends the body as JSON to the given url", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await postScoreAwaitable("/api/game-scores", { game_id: "leksokipos", score: 7 });

    expect(fetchMock).toHaveBeenCalledWith("/api/game-scores", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ game_id: "leksokipos", score: 7 }),
    });
  });

  it("never throws, so a flush cannot crash the caller", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => { throw new Error("boom"); }));
    await expect(postScoreAwaitable("/api/game-scores", {})).resolves.toBe(false);
  });
});
