// useAchievementSync.test.ts — the client glue that detects earned achievements
// at end-of-game and posts fresh ids. Detection itself is tested in achievements.test.ts;
// here we verify the gating (daily / god-mode / device) and the once-per-session dedup.

import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

interface StatsRead { leksokipos_points: number | null; pangram_count: number | null }
const NO_STATS: StatsRead = { leksokipos_points: null, pangram_count: null };

// Each mock carries its real signature from @/games/leksokipos/sync. Typing them
// as zero-arg fns made `mock.calls[0][0]` an index into an empty tuple, so the
// call-shape assertions below were only ever checked at runtime.
type PostAchievementsArgs = { deviceUuid: string; achievementIds: string[] };
type PostPangramsArgs = { deviceUuid: string; puzzleDate: string; words: string[] };
type PostWordsArgs = { deviceUuid: string; puzzleDate: string; words: string[] };

const postAchievements = vi.fn<(params: PostAchievementsArgs) => void>();
const fetchLifetimeStats = vi.fn<(deviceUuid: string) => Promise<StatsRead | null>>(
  async () => NO_STATS,
);
const postPangrams = vi.fn<(params: PostPangramsArgs) => Promise<number | null>>(
  async () => null,
);
const postWords = vi.fn<(params: PostWordsArgs) => Promise<number | null>>(
  async () => null,
);
const fetchEarnedAchievementIds = vi.fn<(deviceUuid: string) => Promise<string[]>>(
  async () => [],
);
vi.mock("@/games/leksokipos/sync", () => ({
  postAchievements: (...args: Parameters<typeof postAchievements>) => postAchievements(...args),
  fetchLifetimeStats: (...args: Parameters<typeof fetchLifetimeStats>) => fetchLifetimeStats(...args),
  postPangrams: (...args: Parameters<typeof postPangrams>) => postPangrams(...args),
  postWords: (...args: Parameters<typeof postWords>) => postWords(...args),
  fetchEarnedAchievementIds: (...args: Parameters<typeof fetchEarnedAchievementIds>) =>
    fetchEarnedAchievementIds(...args),
}));

/** The achievementIds of every postAchievements call flattened into one array. */
function allPostedIds(): string[] {
  return postAchievements.mock.calls.flatMap((c) => c[0].achievementIds);
}

const { useAchievementSync } = await import("@/games/leksokipos/hooks/useAchievementSync");

import type { RankName } from "@/games/leksokipos/lib/ranking";

interface Props {
  enabled?:             boolean;
  isDaily:              boolean;
  isGodMode:            boolean;
  deviceId:             string;
  foundWords:           string[];
  foundPangrams:        string[];
  puzzleDate:           string;
  validWordCount:       number;
  rank:                 RankName;
  onAchievementEarned?: (a: { id: string; name: string; tierLabel?: string }) => void;
}

const BASE: Props = {
  isDaily:        true,
  isGodMode:      false,
  deviceId:       "device-1",
  foundWords:     ["γατα"],
  foundPangrams:  [],
  puzzleDate:     "2026-07-06",
  validWordCount: 20,
  rank:           "Θηρίο",
};

afterEach(() => {
  postAchievements.mockClear();
  fetchLifetimeStats.mockClear();
  fetchLifetimeStats.mockResolvedValue(NO_STATS);
  postPangrams.mockClear();
  postPangrams.mockResolvedValue(null);
  postWords.mockClear();
  postWords.mockResolvedValue(null);
  fetchEarnedAchievementIds.mockClear();
  fetchEarnedAchievementIds.mockResolvedValue([]);
});

describe("useAchievementSync — posting", () => {
  it("posts the ids detected for the current snapshot", () => {
    renderHook(() => useAchievementSync({
      ...BASE,
      foundWords: ["γατα", "ελικοπτερο"], // exactly 10 letters → sidirodromos
    }));
    expect(postAchievements).toHaveBeenCalledTimes(1);
    const arg = postAchievements.mock.calls[0][0];
    expect(arg.deviceUuid).toBe("device-1");
    expect(arg.achievementIds).toEqual(
      expect.arrayContaining(["leksokipos-first-daily", "leksokipos-sidirodromos"]),
    );
  });

  it("does not re-post an id already posted this session", () => {
    const { rerender } = renderHook((props: Props) => useAchievementSync(props), {
      initialProps: { ...BASE, foundWords: ["γατα"] }, // first-daily
    });
    expect(postAchievements).toHaveBeenCalledTimes(1);
    postAchievements.mockClear();

    // Another word found, but no NEW achievement crosses — nothing to post.
    rerender({ ...BASE, foundWords: ["γατα", "σκυλος"] });
    expect(postAchievements).not.toHaveBeenCalled();
  });

  it("posts only the newly-crossed id when state grows into a new achievement", () => {
    const { rerender } = renderHook((props: Props) => useAchievementSync(props), {
      initialProps: { ...BASE, foundWords: ["γατα"] }, // first-daily
    });
    postAchievements.mockClear();

    rerender({ ...BASE, foundWords: ["γατα", "ελικοπτερο"] }); // exactly 10 → adds sidirodromos
    expect(postAchievements).toHaveBeenCalledTimes(1);
    expect(postAchievements.mock.calls[0][0].achievementIds).toEqual(["leksokipos-sidirodromos"]);
  });
});

describe("useAchievementSync — points-tier lane", () => {
  it("posts every crossed points-tier id from the lifetime stats read", async () => {
    fetchLifetimeStats.mockResolvedValue({ leksokipos_points: 12000, pangram_count: null }); // ≥ chalkino + asimenio
    renderHook(() => useAchievementSync({ ...BASE }));

    await waitFor(() => {
      expect(allPostedIds()).toEqual(
        expect.arrayContaining([
          "leksokipos-syllektis-ponton-chalkino",
          "leksokipos-syllektis-ponton-asimenio",
        ]),
      );
    });
    expect(allPostedIds()).not.toContain("leksokipos-syllektis-ponton-chryso");
  });

  it("posts no points tier when lifetime points are below the first threshold", async () => {
    fetchLifetimeStats.mockResolvedValue({ leksokipos_points: 999, pangram_count: null });
    renderHook(() => useAchievementSync({ ...BASE, foundWords: [] })); // no one-shots either
    await waitFor(() => expect(fetchLifetimeStats).toHaveBeenCalled());
    expect(postAchievements).not.toHaveBeenCalled();
  });

  it("posts no points tier when the stats read returns null", async () => {
    fetchLifetimeStats.mockResolvedValue(null);
    renderHook(() => useAchievementSync({ ...BASE, foundWords: [] }));
    await waitFor(() => expect(fetchLifetimeStats).toHaveBeenCalled());
    expect(postAchievements).not.toHaveBeenCalled();
  });
});

describe("useAchievementSync — pangram-tier lane (delta-post)", () => {
  it("delta-posts newly-found pangrams and posts the tier crossed by the returned count", async () => {
    postPangrams.mockResolvedValue(10); // χάλκινο threshold
    renderHook(() => useAchievementSync({
      ...BASE, foundWords: [], foundPangrams: ["παρακολουθηση"],
    }));

    await waitFor(() => expect(postPangrams).toHaveBeenCalled());
    expect(postPangrams.mock.calls[0][0]).toEqual({
      deviceUuid: "device-1", puzzleDate: "2026-07-06", words: ["παρακολουθηση"],
    });
    await waitFor(() =>
      expect(allPostedIds()).toContain("leksokipos-kynigos-pangram-chalkino"),
    );
  });

  it("posts only the not-yet-posted pangram words on a later render (per-word dedup)", async () => {
    postPangrams.mockResolvedValue(1);
    const { rerender } = renderHook((props: Props) => useAchievementSync(props), {
      initialProps: { ...BASE, foundWords: [], foundPangrams: ["πρωτοπανγκραμ"] },
    });
    await waitFor(() => expect(postPangrams).toHaveBeenCalledTimes(1));
    postPangrams.mockClear();

    rerender({ ...BASE, foundWords: [], foundPangrams: ["πρωτοπανγκραμ", "δευτεροπανγκραμ"] });
    await waitFor(() => expect(postPangrams).toHaveBeenCalledTimes(1));
    expect(postPangrams.mock.calls[0][0].words).toEqual(["δευτεροπανγκραμ"]);
  });

  it("posts nothing when there are no pangrams to send", async () => {
    renderHook(() => useAchievementSync({ ...BASE, foundWords: [], foundPangrams: [] }));
    await waitFor(() => expect(fetchLifetimeStats).toHaveBeenCalled());
    expect(postPangrams).not.toHaveBeenCalled();
  });

  it("posts no pangram tier when the returned count is below the first threshold", async () => {
    postPangrams.mockResolvedValue(9);
    renderHook(() => useAchievementSync({ ...BASE, foundWords: [], foundPangrams: ["καποιοπανγκραμ"] }));
    await waitFor(() => expect(postPangrams).toHaveBeenCalled());
    expect(postAchievements).not.toHaveBeenCalled();
  });

  // Self-heal lane: on mount the pangram_count read heals owed tiers even when no
  // new pangram is found this session (crash/offline gap between write and tier POST).
  it("self-heals owed pangram tiers from the mount pangram_count read", async () => {
    fetchLifetimeStats.mockResolvedValue({ leksokipos_points: null, pangram_count: 20 }); // chalkino + asimenio
    renderHook(() => useAchievementSync({ ...BASE, foundWords: [], foundPangrams: [] }));

    await waitFor(() =>
      expect(allPostedIds()).toEqual(
        expect.arrayContaining([
          "leksokipos-kynigos-pangram-chalkino",
          "leksokipos-kynigos-pangram-asimenio",
        ]),
      ),
    );
    expect(postPangrams).not.toHaveBeenCalled();
  });

  it("surfaces a newly-crossed pangram tier to the toast with its Greek tier label", async () => {
    fetchEarnedAchievementIds.mockResolvedValue([]);
    postPangrams.mockResolvedValue(10); // χάλκινο
    const onAchievementEarned = vi.fn();
    renderHook(() => useAchievementSync({
      ...BASE, foundWords: [], foundPangrams: ["παρακολουθηση"], onAchievementEarned,
    }));

    await waitFor(() =>
      expect(onAchievementEarned).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "leksokipos-kynigos-pangram-chalkino",
          name: "Κυνηγός Πανγκράμ",
          tierLabel: "Χάλκινο",
        }),
      ),
    );
  });
});

describe("useAchievementSync — words-capture lane (delta-post)", () => {
  it("delta-posts the valid words found this session (display-only, no tier)", async () => {
    renderHook(() => useAchievementSync({
      ...BASE, foundWords: ["γατα", "σκυλος"], foundPangrams: [],
    }));

    await waitFor(() => expect(postWords).toHaveBeenCalled());
    expect(postWords.mock.calls[0][0]).toEqual({
      deviceUuid: "device-1", puzzleDate: "2026-07-06", words: ["γατα", "σκυλος"],
    });
  });

  it("posts only the not-yet-posted words on a later render (per-word dedup)", async () => {
    const { rerender } = renderHook((props: Props) => useAchievementSync(props), {
      initialProps: { ...BASE, foundWords: ["γατα"], foundPangrams: [] },
    });
    await waitFor(() => expect(postWords).toHaveBeenCalledTimes(1));
    postWords.mockClear();

    rerender({ ...BASE, foundWords: ["γατα", "σκυλος"], foundPangrams: [] });
    await waitFor(() => expect(postWords).toHaveBeenCalledTimes(1));
    expect(postWords.mock.calls[0][0].words).toEqual(["σκυλος"]);
  });

  it("posts nothing when there are no words to send", async () => {
    renderHook(() => useAchievementSync({ ...BASE, foundWords: [], foundPangrams: [] }));
    await waitFor(() => expect(fetchLifetimeStats).toHaveBeenCalled());
    expect(postWords).not.toHaveBeenCalled();
  });
});

describe("useAchievementSync — unlock toast surfacing", () => {
  it("surfaces a genuinely-new one-shot badge to the toast callback", async () => {
    fetchEarnedAchievementIds.mockResolvedValue([]); // nothing earned before
    const onAchievementEarned = vi.fn();
    renderHook(() => useAchievementSync({ ...BASE, foundWords: ["γατα"], onAchievementEarned }));

    await waitFor(() =>
      expect(onAchievementEarned).toHaveBeenCalledWith(
        expect.objectContaining({ id: "leksokipos-first-daily", name: "Πρώτα Βήματα" }),
      ),
    );
  });

  it("toasts only the newly-earned badge, suppressing ones earned in a prior session", async () => {
    fetchEarnedAchievementIds.mockResolvedValue(["leksokipos-first-daily"]);
    const onAchievementEarned = vi.fn();
    // γατα → first-daily (already earned); ελικοπτερο (exactly 10) → sidirodromos (new)
    renderHook(() =>
      useAchievementSync({ ...BASE, foundWords: ["γατα", "ελικοπτερο"], onAchievementEarned }),
    );

    await waitFor(() =>
      expect(onAchievementEarned).toHaveBeenCalledWith(
        expect.objectContaining({ id: "leksokipos-sidirodromos" }),
      ),
    );
    expect(onAchievementEarned).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: "leksokipos-first-daily" }),
    );
    expect(onAchievementEarned).toHaveBeenCalledTimes(1);
  });

  it("surfaces a newly-crossed points tier with its Greek tier label", async () => {
    fetchEarnedAchievementIds.mockResolvedValue([]);
    fetchLifetimeStats.mockResolvedValue({ leksokipos_points: 1500, pangram_count: null }); // χάλκινο
    const onAchievementEarned = vi.fn();
    renderHook(() => useAchievementSync({ ...BASE, foundWords: [], onAchievementEarned }));

    await waitFor(() =>
      expect(onAchievementEarned).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "leksokipos-syllektis-ponton-chalkino",
          name: "Συλλέκτης Πόντων",
          tierLabel: "Χάλκινο",
        }),
      ),
    );
  });

  it("toasts only the newly-crossed tier, suppressing an already-earned lower tier", async () => {
    fetchEarnedAchievementIds.mockResolvedValue(["leksokipos-syllektis-ponton-chalkino"]);
    fetchLifetimeStats.mockResolvedValue({ leksokipos_points: 12000, pangram_count: null }); // χάλκινο (earned) + ασημένιο (new)
    const onAchievementEarned = vi.fn();
    renderHook(() => useAchievementSync({ ...BASE, foundWords: [], onAchievementEarned }));

    await waitFor(() =>
      expect(onAchievementEarned).toHaveBeenCalledWith(
        expect.objectContaining({ id: "leksokipos-syllektis-ponton-asimenio" }),
      ),
    );
    expect(onAchievementEarned).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: "leksokipos-syllektis-ponton-chalkino" }),
    );
  });
});

describe("useAchievementSync — gating", () => {
  it("does nothing on a non-daily puzzle", () => {
    renderHook(() => useAchievementSync({ ...BASE, isDaily: false, foundPangrams: ["παρακολουθηση"] }));
    expect(postAchievements).not.toHaveBeenCalled();
    expect(fetchLifetimeStats).not.toHaveBeenCalled();
    expect(postPangrams).not.toHaveBeenCalled();
    expect(postWords).not.toHaveBeenCalled();
  });

  it("does nothing in god mode", () => {
    renderHook(() => useAchievementSync({ ...BASE, isGodMode: true, foundPangrams: ["παρακολουθηση"] }));
    expect(postAchievements).not.toHaveBeenCalled();
    expect(fetchLifetimeStats).not.toHaveBeenCalled();
    expect(postPangrams).not.toHaveBeenCalled();
    expect(postWords).not.toHaveBeenCalled();
  });

  it("does nothing without a device id", () => {
    renderHook(() => useAchievementSync({ ...BASE, deviceId: "", foundPangrams: ["παρακολουθηση"] }));
    expect(postAchievements).not.toHaveBeenCalled();
    expect(fetchLifetimeStats).not.toHaveBeenCalled();
    expect(postPangrams).not.toHaveBeenCalled();
    expect(postWords).not.toHaveBeenCalled();
  });

  it("is fully inert when disabled — no detection, no reads, no writes", () => {
    const onAchievementEarned = vi.fn();
    renderHook(() => useAchievementSync({
      ...BASE,
      enabled: false,
      foundWords: ["γατα", "ελικοπτερο"], // would earn first-daily + sidirodromos if enabled
      foundPangrams: ["παρακολουθηση"],
      onAchievementEarned,
    }));
    expect(postAchievements).not.toHaveBeenCalled();
    expect(fetchLifetimeStats).not.toHaveBeenCalled();
    expect(postPangrams).not.toHaveBeenCalled();
    expect(postWords).not.toHaveBeenCalled();
    expect(fetchEarnedAchievementIds).not.toHaveBeenCalled();
    expect(onAchievementEarned).not.toHaveBeenCalled();
  });
});
