// useAchievementSync.test.ts — the client glue that detects earned achievements
// and milestones from the live snapshot and posts them. Detection itself is tested
// in achievements.test.ts; here we verify the gating (daily / god-mode / device),
// the once-per-session dedup, and the per-lane posting rules.
//
// Four write lanes now share one endpoint (POST /api/milestones):
//   pangram  — delta-post per find, tier read off the returned count (no lag)
//   word     — delta-post per find, CLIENT-FILTERED to the ≥10 storage floor
//   top_rank — once per puzzle_date, the day the top rank is first reached
//   tzimani  — once per puzzle_date, the day the found-word ratio is first crossed

import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

interface StatsRead { leksokipos_points: number | null; pangram_count: number | null }
const NO_STATS: StatsRead = { leksokipos_points: null, pangram_count: null };

// Each mock carries its real signature from @/games/leksokipos/sync. Typing them
// as zero-arg fns made `mock.calls[0][0]` an index into an empty tuple, so the
// call-shape assertions below were only ever checked at runtime.
type PostAchievementsArgs = { deviceUuid: string; achievementIds: string[] };
type MilestonePost = { kind: string; detail?: string; value?: number };
type PostMilestonesArgs = { deviceUuid: string; puzzleDate: string; milestones: MilestonePost[] };
type MilestoneCounts = Record<string, number>;

const postAchievements = vi.fn<(params: PostAchievementsArgs) => void>();
const fetchLifetimeStats = vi.fn<(deviceUuid: string) => Promise<StatsRead | null>>(
  async () => NO_STATS,
);
const postMilestones = vi.fn<(params: PostMilestonesArgs) => Promise<MilestoneCounts | null>>(
  async () => ({}),
);
const fetchEarnedAchievementIds = vi.fn<(deviceUuid: string) => Promise<string[]>>(
  async () => [],
);
vi.mock("@/games/leksokipos/sync", () => ({
  postAchievements: (...args: Parameters<typeof postAchievements>) => postAchievements(...args),
  fetchLifetimeStats: (...args: Parameters<typeof fetchLifetimeStats>) => fetchLifetimeStats(...args),
  postMilestones: (...args: Parameters<typeof postMilestones>) => postMilestones(...args),
  fetchEarnedAchievementIds: (...args: Parameters<typeof fetchEarnedAchievementIds>) =>
    fetchEarnedAchievementIds(...args),
}));

/** The achievementIds of every postAchievements call flattened into one array. */
function allPostedIds(): string[] {
  return postAchievements.mock.calls.flatMap((c) => c[0].achievementIds);
}

/** Every posted milestone of one kind, across all calls. */
function postedOfKind(kind: string): MilestonePost[] {
  return postMilestones.mock.calls
    .flatMap((c) => c[0].milestones)
    .filter((m) => m.kind === kind);
}

const { useAchievementSync } = await import("@/games/leksokipos/hooks/useAchievementSync");

import type { RankName } from "@/games/leksokipos/lib/ranking";
import { LEKSOKIPOS_ACHIEVEMENT_TUNING } from "@/config/achievementTuning";

// Derived, not hardcoded: this file tests LANE behaviour (does a crossing get
// posted at all), so it must not re-break every time the thresholds are re-balanced.
// The boundary values themselves are pinned with literals in achievements.test.ts.
const PANGRAM_TIERS = LEKSOKIPOS_ACHIEVEMENT_TUNING.pangramTierThresholds;

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
  postMilestones.mockClear();
  postMilestones.mockResolvedValue({});
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

describe("useAchievementSync — pangram lane (delta-post)", () => {
  it("delta-posts newly-found pangrams and posts the tier crossed by the returned count", async () => {
    postMilestones.mockResolvedValue({ pangram: PANGRAM_TIERS.chalkino });
    renderHook(() => useAchievementSync({
      ...BASE, foundWords: [], foundPangrams: ["παρακολουθηση"],
    }));

    await waitFor(() => expect(postedOfKind("pangram")).toHaveLength(1));
    expect(postedOfKind("pangram")).toEqual([{ kind: "pangram", detail: "παρακολουθηση" }]);
    await waitFor(() =>
      expect(allPostedIds()).toContain("leksokipos-kynigos-pangram-chalkino"),
    );
  });

  it("posts only the not-yet-posted pangram words on a later render (per-word dedup)", async () => {
    const { rerender } = renderHook((props: Props) => useAchievementSync(props), {
      initialProps: { ...BASE, foundWords: [], foundPangrams: ["πρωτοπανγκραμ"] },
    });
    await waitFor(() => expect(postedOfKind("pangram")).toHaveLength(1));
    postMilestones.mockClear();

    rerender({ ...BASE, foundWords: [], foundPangrams: ["πρωτοπανγκραμ", "δευτεροπανγκραμ"] });
    await waitFor(() => expect(postedOfKind("pangram")).toHaveLength(1));
    expect(postedOfKind("pangram")[0].detail).toBe("δευτεροπανγκραμ");
  });

  it("posts nothing when there are no pangrams to send", async () => {
    renderHook(() => useAchievementSync({ ...BASE, foundWords: [], foundPangrams: [] }));
    await waitFor(() => expect(fetchLifetimeStats).toHaveBeenCalled());
    expect(postedOfKind("pangram")).toHaveLength(0);
  });

  it("posts no pangram tier when the returned count is below the first threshold", async () => {
    postMilestones.mockResolvedValue({ pangram: PANGRAM_TIERS.chalkino - 1 });
    renderHook(() => useAchievementSync({ ...BASE, foundWords: [], foundPangrams: ["καποιοπανγκραμ"] }));
    await waitFor(() => expect(postedOfKind("pangram")).toHaveLength(1));
    expect(postAchievements).not.toHaveBeenCalled();
  });

  it("skips the crossing check when the server withheld the count (nothing was new)", async () => {
    // An empty map is the server's answer to a pure re-post: no row was inserted,
    // so no total moved. It must read as "no crossing", never as a count of zero.
    postMilestones.mockResolvedValue({});
    renderHook(() => useAchievementSync({ ...BASE, foundWords: [], foundPangrams: ["καποιοπανγκραμ"] }));
    await waitFor(() => expect(postedOfKind("pangram")).toHaveLength(1));
    expect(postAchievements).not.toHaveBeenCalled();
  });

  // Self-heal lane: on mount the pangram_count read heals owed tiers even when no
  // new pangram is found this session (crash/offline gap between write and tier POST).
  it("self-heals owed pangram tiers from the mount pangram_count read", async () => {
    fetchLifetimeStats.mockResolvedValue({
      leksokipos_points: null, pangram_count: PANGRAM_TIERS.asimenio, // chalkino + asimenio
    });
    renderHook(() => useAchievementSync({ ...BASE, foundWords: [], foundPangrams: [] }));

    await waitFor(() =>
      expect(allPostedIds()).toEqual(
        expect.arrayContaining([
          "leksokipos-kynigos-pangram-chalkino",
          "leksokipos-kynigos-pangram-asimenio",
        ]),
      ),
    );
    expect(postedOfKind("pangram")).toHaveLength(0);
  });

  it("surfaces a newly-crossed pangram tier to the toast with its Greek tier label", async () => {
    fetchEarnedAchievementIds.mockResolvedValue([]);
    postMilestones.mockResolvedValue({ pangram: PANGRAM_TIERS.chalkino });
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

describe("useAchievementSync — word lane (client-filtered delta-post)", () => {
  it("posts only words at or above the ≥10 storage floor", async () => {
    // The lane used to fire per find and let the server drop the short ones — ~30
    // wasted requests a game. The server floor still stands as the backstop.
    renderHook(() => useAchievementSync({
      ...BASE, foundWords: ["γατα", "σκυλος", "ελικοπτερο"], foundPangrams: [],
    }));

    await waitFor(() => expect(postedOfKind("word")).toHaveLength(1));
    expect(postedOfKind("word")).toEqual([{ kind: "word", detail: "ελικοπτερο" }]);
  });

  it("posts nothing at all when no find clears the floor", async () => {
    renderHook(() => useAchievementSync({
      ...BASE, foundWords: ["γατα", "σκυλος", "σπιτι"], foundPangrams: [],
    }));
    await waitFor(() => expect(fetchLifetimeStats).toHaveBeenCalled());
    expect(postMilestones).not.toHaveBeenCalled();
  });

  it("posts only the not-yet-posted long words on a later render (per-word dedup)", async () => {
    const { rerender } = renderHook((props: Props) => useAchievementSync(props), {
      initialProps: { ...BASE, foundWords: ["ελικοπτερο"], foundPangrams: [] },
    });
    await waitFor(() => expect(postedOfKind("word")).toHaveLength(1));
    postMilestones.mockClear();

    rerender({ ...BASE, foundWords: ["ελικοπτερο", "παρακολουθηση"], foundPangrams: [] });
    await waitFor(() => expect(postedOfKind("word")).toHaveLength(1));
    expect(postedOfKind("word")[0].detail).toBe("παρακολουθηση");
  });

  it("ignores the returned count — the word lane has no tier to cross", async () => {
    postMilestones.mockResolvedValue({ word: 999 });
    renderHook(() => useAchievementSync({ ...BASE, foundWords: ["ελικοπτερο"], foundPangrams: [] }));
    await waitFor(() => expect(postedOfKind("word")).toHaveLength(1));
    expect(allPostedIds()).not.toContain("leksokipos-kynigos-pangram-chalkino");
  });
});

describe("useAchievementSync — day-milestone lane", () => {
  const TOP_RANK: RankName = "Απολυτότητα";

  it("records the day the player reaches the top rank", async () => {
    renderHook(() => useAchievementSync({ ...BASE, foundWords: [], rank: TOP_RANK }));
    await waitFor(() => expect(postedOfKind("top_rank")).toHaveLength(1));
    expect(postMilestones.mock.calls[0][0]).toMatchObject({
      deviceUuid: "device-1", puzzleDate: "2026-07-06",
    });
  });

  it("records the day the found-word ratio is crossed, with the percentage", async () => {
    renderHook(() => useAchievementSync({
      ...BASE,
      foundWords:     Array.from({ length: 18 }, (_, i) => `word${i}`),
      validWordCount: 20, // 90%
    }));
    await waitFor(() => expect(postedOfKind("tzimani")).toHaveLength(1));
    expect(postedOfKind("tzimani")[0]).toEqual({ kind: "tzimani", value: 90 });
  });

  it("records each kind once per puzzle date, however often the snapshot changes", async () => {
    // The lane re-runs on every foundWords/rank change, exactly like the one-shot
    // lane — without a per-(date, kind) ref that is one POST per word found.
    const { rerender } = renderHook((props: Props) => useAchievementSync(props), {
      initialProps: { ...BASE, foundWords: ["γατα"], rank: TOP_RANK },
    });
    await waitFor(() => expect(postedOfKind("top_rank")).toHaveLength(1));

    rerender({ ...BASE, foundWords: ["γατα", "σκυλος"], rank: TOP_RANK });
    rerender({ ...BASE, foundWords: ["γατα", "σκυλος", "σπιτι"], rank: TOP_RANK });
    await waitFor(() => expect(postedOfKind("top_rank")).toHaveLength(1));
  });

  it("records the same kind again on a different puzzle date", async () => {
    const { rerender } = renderHook((props: Props) => useAchievementSync(props), {
      initialProps: { ...BASE, foundWords: [], rank: TOP_RANK },
    });
    await waitFor(() => expect(postedOfKind("top_rank")).toHaveLength(1));

    rerender({ ...BASE, foundWords: [], rank: TOP_RANK, puzzleDate: "2026-07-07" });
    await waitFor(() => expect(postedOfKind("top_rank")).toHaveLength(2));
  });

  it("records nothing on a round that qualifies for neither", async () => {
    renderHook(() => useAchievementSync({ ...BASE, foundWords: ["γατα"], rank: "Θηρίο" }));
    await waitFor(() => expect(fetchLifetimeStats).toHaveBeenCalled());
    expect(postedOfKind("top_rank")).toHaveLength(0);
    expect(postedOfKind("tzimani")).toHaveLength(0);
  });

  it("records both kinds in a single request when a round qualifies for each", async () => {
    renderHook(() => useAchievementSync({
      ...BASE,
      foundWords:     Array.from({ length: 20 }, (_, i) => `word${i}`),
      validWordCount: 20,
      rank:           TOP_RANK,
    }));
    await waitFor(() => expect(postedOfKind("top_rank")).toHaveLength(1));
    const withCounters = postMilestones.mock.calls
      .map((c) => c[0].milestones)
      .find((ms) => ms.some((m) => m.kind === "top_rank"));
    expect(withCounters?.map((m) => m.kind).sort()).toEqual(["top_rank", "tzimani"]);
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
  /** A snapshot that would fire every lane if the gate let it through. */
  const LOADED: Partial<Props> = {
    foundWords:     ["ελικοπτερο", ...Array.from({ length: 19 }, (_, i) => `word${i}`)],
    foundPangrams:  ["παρακολουθηση"],
    validWordCount: 20,
    rank:           "Απολυτότητα",
  };

  it("does nothing on a non-daily puzzle", () => {
    renderHook(() => useAchievementSync({ ...BASE, ...LOADED, isDaily: false }));
    expect(postAchievements).not.toHaveBeenCalled();
    expect(fetchLifetimeStats).not.toHaveBeenCalled();
    expect(postMilestones).not.toHaveBeenCalled();
  });

  it("does nothing in god mode", () => {
    renderHook(() => useAchievementSync({ ...BASE, ...LOADED, isGodMode: true }));
    expect(postAchievements).not.toHaveBeenCalled();
    expect(fetchLifetimeStats).not.toHaveBeenCalled();
    expect(postMilestones).not.toHaveBeenCalled();
  });

  it("does nothing without a device id", () => {
    renderHook(() => useAchievementSync({ ...BASE, ...LOADED, deviceId: "" }));
    expect(postAchievements).not.toHaveBeenCalled();
    expect(fetchLifetimeStats).not.toHaveBeenCalled();
    expect(postMilestones).not.toHaveBeenCalled();
  });

  it("is fully inert when disabled — no detection, no reads, no writes", () => {
    const onAchievementEarned = vi.fn();
    renderHook(() => useAchievementSync({
      ...BASE, ...LOADED, enabled: false, onAchievementEarned,
    }));
    expect(postAchievements).not.toHaveBeenCalled();
    expect(fetchLifetimeStats).not.toHaveBeenCalled();
    expect(postMilestones).not.toHaveBeenCalled();
    expect(fetchEarnedAchievementIds).not.toHaveBeenCalled();
    expect(onAchievementEarned).not.toHaveBeenCalled();
  });
});
