// dailyPuzzleSelection.test.ts — the one invariant every Game's answer to
// "which puzzle is date D?" must satisfy, asserted against all nine of them.
//
// Each Game answers that question its own way, and the variation is real: some
// read a hand-authored calendar, three prefer a Community Puzzle scheduled for
// the date, one skips rotations that would leak another Game's same-day answer.
// What must NOT vary is what happens on a MISS — a date the Game's own content
// does not cover. Before this file the miss rule was a per-Game secret and only
// Leksokipos's was guarded, by a corpus test that proves the calendar has no
// interior gaps but says nothing about the day after the calendar ends.
//
// The invariant, in three parts:
//   1. Every date is answerable  — a Daily Puzzle page renders or the Game is
//      dark; no miss may throw or return nothing.
//   2. A miss never freezes      — serving one fixed board (e.g. "the last row")
//      on every uncovered day forever is a silent outage, not a fallback.
//   3. A miss never runs ahead   — a row pinned to a future calendar day must
//      not surface early, which would spoil it and then repeat it on its day.
//
// Rotation arithmetic itself is puzzleRotation.test.ts; this file is about the
// policy wrapped around it.

import { describe, expect, it, vi } from "vitest";

import { todayISO } from "@/lib/puzzleDate";

// ── No Community Puzzle is ever scheduled here ────────────────────────────────
// The three community-first loaders are only interesting to this file on their
// fallback path — the scheduled path is covered by communityPuzzleScheduling.
const consumeApprovedPuzzle = vi.fn().mockResolvedValue(null);

vi.mock("@/lib/communityPuzzleLifecycle", () => ({
  consumeApprovedPuzzle: (...args: unknown[]) => consumeApprovedPuzzle(...args),
}));

const { getPuzzleForDate }              = await import("@/data/leksokipos");
const { getPuzzleStubForDate }          = await import("@/data/leksokipos/puzzleIndex");
const { getAllTodaysLeksiarxeioPuzzles } = await import("@/data/leksiarxeio");
const { getTodaysLeksindeseisPuzzle, allLeksindeseisPuzzles } =
  await import("@/data/leksindeseis");
const { getTodaysVresTinFrasiPuzzle }   = await import("@/data/vrestifrasi");
const { getTodaysLeksodromiaPuzzle }    = await import("@/data/leksodromia");
const { getPuzzleForDate: getLeksoplegmaPuzzleForDate } = await import("@/data/leksoplegma");
const { TOPOTHESIES_ANSWERS }           = await import("@/data/topothesies");
const { POSOKANEI_PUZZLES }             = await import("@/data/posokanei");
const { LOGOPAIGNIO_PUZZLES }           = await import("@/data/logopaignio");

const { selectDailyPuzzle: selectTopothesies } =
  await import("@/games/topothesies/lib/selectDailyPuzzle");
const { selectDailyPuzzle: selectPosokanei } =
  await import("@/games/posokanei/lib/selectDailyPuzzle");
const { selectDailyPuzzle: selectLogopaignio } =
  await import("@/games/logopaignio/lib/selectDailyPuzzle");

// ── Dates ─────────────────────────────────────────────────────────────────────

function datesFrom(startISO: string, count: number): string[] {
  const out = [];
  const d = new Date(startISO + "T00:00:00Z");
  for (let i = 0; i < count; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** The live window — every Game must be playable here today. */
const NEAR = datesFrom(todayISO(), 14);

/**
 * Deliberately past the end of every authored calendar in the repo (Leksokipos
 * runs to 2028), so these dates are all misses. Fixed, not relative, so the
 * sweep tests never depend on the clock.
 */
const BEYOND = datesFrom("2030-01-01", 14);

// ── The nine Games, reduced to what the invariant needs ───────────────────────

interface DailySelection {
  name: string;
  /** Resolve the Daily Puzzle for a date. `pinnedDate` = the row's own authored date. */
  pick: (date: string) => Promise<{ id: string; pinnedDate?: string }>;
  /** False for a one-row pool, where "never freezes" is unassertable by construction. */
  varies: boolean;
}

const SELECTIONS: DailySelection[] = [
  {
    name: "Λεξόκηπος",
    pick: async (date) => {
      const p = getPuzzleForDate(date);
      return { id: p.id, pinnedDate: p.date };
    },
    varies: true,
  },
  {
    // The slim mirror the /leksokipos redirect uses. It has its own copy of the
    // corpus (puzzles-index-el.json), so it needs its own proof, not parity alone.
    name: "Λεξόκηπος (slim index)",
    pick: async (date) => {
      const p = getPuzzleStubForDate(date);
      return { id: p.id, pinnedDate: p.date };
    },
    varies: true,
  },
  {
    name: "Λεξιαρχείο",
    pick: async (date) => {
      const { puzzles } = await getAllTodaysLeksiarxeioPuzzles(date);
      return { id: puzzles.map((p) => p.answer).join("|") };
    },
    varies: true,
  },
  {
    name: "Λεξινδέσεις",
    pick: async (date) => {
      const { puzzle } = await getTodaysLeksindeseisPuzzle(date);
      if (!puzzle) throw new Error("no puzzle");
      return { id: JSON.stringify(puzzle.groups) };
    },
    varies: allLeksindeseisPuzzles.length > 1,
  },
  {
    name: "Βρες τη Φράση",
    pick: async (date) => ({ id: (await getTodaysVresTinFrasiPuzzle(date)).puzzle.phrase }),
    varies: true,
  },
  {
    name: "Λεξοδρομία",
    pick: async (date) => ({ id: getTodaysLeksodromiaPuzzle(date).words.join("|") }),
    varies: true,
  },
  {
    name: "Λεξόπλεγμα",
    pick: async (date) => ({ id: getLeksoplegmaPuzzleForDate(date).id }),
    varies: true,
  },
  {
    name: "Τοποθεσίες",
    pick: async (date) => ({ id: selectTopothesies(date, TOPOTHESIES_ANSWERS).id }),
    varies: true,
  },
  {
    name: "Πόσο κάνει;",
    pick: async (date) => {
      // No id field — a Πόσο κάνει; puzzle's identity IS its date.
      const p = selectPosokanei(date, POSOKANEI_PUZZLES);
      return { id: p.date, pinnedDate: p.date };
    },
    varies: POSOKANEI_PUZZLES.length > 1,
  },
  {
    name: "Λογοπαίγνιο",
    pick: async (date) => {
      const p = selectLogopaignio(date, LOGOPAIGNIO_PUZZLES);
      return { id: p.id, pinnedDate: p.date };
    },
    varies: LOGOPAIGNIO_PUZZLES.length > 1,
  },
];

// ── Part 1: every date is answerable ──────────────────────────────────────────

describe.each(SELECTIONS)("$name — answers every date", ({ pick }) => {
  it("serves a puzzle across the live window", async () => {
    for (const date of NEAR) {
      await expect(pick(date)).resolves.toEqual(
        expect.objectContaining({ id: expect.any(String) }),
      );
    }
  });

  it("serves a puzzle long after its content runs out", async () => {
    for (const date of BEYOND) {
      await expect(pick(date)).resolves.toEqual(
        expect.objectContaining({ id: expect.any(String) }),
      );
    }
  });

  it("serves the same puzzle on every call for one date", async () => {
    for (const date of [NEAR[0], BEYOND[0]]) {
      expect((await pick(date)).id).toBe((await pick(date)).id);
    }
  });
});

// ── Part 2: a miss never freezes ──────────────────────────────────────────────

describe.each(SELECTIONS.filter((s) => s.varies))("$name — a miss never freezes", ({ pick }) => {
  it("keeps rotating past the end of its content instead of pinning one board", async () => {
    // The defect this catches: a "fall back to the last row" miss rule serves
    // one board on every uncovered day, for good. Fourteen consecutive days
    // beyond the content must not all be the same puzzle.
    const ids = new Set<string>();
    for (const date of BEYOND) ids.add((await pick(date)).id);

    expect(ids.size).toBeGreaterThan(1);
  });
});

// ── Part 3: a miss never runs ahead ───────────────────────────────────────────

const CALENDARS = SELECTIONS.filter((s) => s.name.startsWith("Λεξόκηπος"));

describe.each(CALENDARS)("$name — a miss never runs ahead", ({ pick }) => {
  it("never serves a board pinned to a later date than the one asked for", async () => {
    // Only meaningful for the hand-authored calendars: their rows carry their
    // own date, so serving one early both spoils it and repeats it later.
    for (const date of [...NEAR, ...BEYOND]) {
      const { pinnedDate } = await pick(date);
      expect(pinnedDate && pinnedDate <= date, `${date} served a board for ${pinnedDate}`)
        .toBe(true);
    }
  });
});

// ── The exhaustion early-warning ──────────────────────────────────────────────

describe("Λεξόκηπος calendar horizon", () => {
  // Λεξόκηπος is the only Game whose daily content is a finite hand-authored
  // calendar rather than a pool it rotates forever, so it is the only one that
  // can run out. The rotation above means running out degrades gracefully
  // instead of freezing — but players would still be replaying old boards.
  // This test is the notice: it fails ~6 months before the corpus ends, which
  // is the lead time `npm run generate-puzzle-batch` needs.
  const HORIZON_DAYS = 180;

  it(`has an authored board for every day in the next ${HORIZON_DAYS}`, () => {
    const uncovered = datesFrom(todayISO(), HORIZON_DAYS)
      .filter((date) => getPuzzleForDate(date).date !== date);

    expect(
      uncovered,
      `${uncovered.length} of the next ${HORIZON_DAYS} days have no authored Λεξόκηπος board. ` +
        "Generate a new batch — until then those days replay old boards.",
    ).toEqual([]);
  });
});
