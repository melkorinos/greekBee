// communityPuzzleScheduling.test.ts
// The three data loaders that serve a Community Puzzle — Vres Tin Frasi,
// Leksiarxeio, Leksindeseis — as seen from the page that calls them.
//
// This is the regression surface for the scheduled-release defect (s134): the
// loaders each take a `date` but used to call consumeApprovedPuzzle() with no
// date at all, so ANY date requested — including an archive date reached through
// the leaderboard day-strip's ?puzzle= link — served whatever row sat at the head
// of the queue, and consuming DELETEd it. The date now reaches the query, and a
// date with nothing scheduled falls through to the deterministic static rotation.

import { beforeEach, describe, expect, it, vi } from "vitest";

import { dateToIndex } from "@/lib/puzzleRotation";

// ── consumeApprovedPuzzle mock (the loaders' only DB dependency) ──────────────

const consumeApprovedPuzzle = vi.fn();

vi.mock("@/lib/communityPuzzleLifecycle", () => ({
  consumeApprovedPuzzle: (...args: unknown[]) => consumeApprovedPuzzle(...args),
}));

const { getTodaysVresTinFrasiPuzzle } = await import("@/data/vrestifrasi");
const { getAllTodaysLeksiarxeioPuzzles, getAnswerPool, LEKSIARXEIO_LENGTHS } =
  await import("@/data/leksiarxeio");
const { getTodaysLeksindeseisPuzzle, allLeksindeseisPuzzles } =
  await import("@/data/leksindeseis");

/** No community puzzle is scheduled for the requested date. */
function nothingScheduled() {
  consumeApprovedPuzzle.mockResolvedValue(null);
}

/** A community puzzle IS scheduled for the requested date. */
function scheduled(data: unknown, submitter: string | null = "Νίκος") {
  consumeApprovedPuzzle.mockResolvedValue({ data, submitter_name: submitter });
}

const TODAY   = "2026-08-05";
const ARCHIVE = "2026-07-20";

beforeEach(() => {
  consumeApprovedPuzzle.mockReset();
});

// ── The shared contract ───────────────────────────────────────────────────────

describe("community puzzle loaders — the date reaches the query", () => {
  it("Vres Tin Frasi asks for the date it was given, not today", async () => {
    nothingScheduled();
    await getTodaysVresTinFrasiPuzzle(ARCHIVE);
    expect(consumeApprovedPuzzle).toHaveBeenCalledWith(
      "community_vrestifrasi_puzzles",
      ARCHIVE,
    );
  });

  it("Leksiarxeio asks for the date it was given, not today", async () => {
    nothingScheduled();
    await getAllTodaysLeksiarxeioPuzzles(ARCHIVE);
    expect(consumeApprovedPuzzle).toHaveBeenCalledWith(
      "community_leksiarxeio_puzzles",
      ARCHIVE,
    );
  });

  it("Leksindeseis asks for the date it was given, not today", async () => {
    nothingScheduled();
    await getTodaysLeksindeseisPuzzle(ARCHIVE);
    expect(consumeApprovedPuzzle).toHaveBeenCalledWith(
      "community_leksindeseis_puzzles",
      ARCHIVE,
    );
  });
});

// ── Vres Tin Frasi ────────────────────────────────────────────────────────────

describe("getTodaysVresTinFrasiPuzzle", () => {
  it("serves the phrase scheduled for that date, stamped with it", async () => {
    scheduled({ phrase: "καλη χρονια" });
    const { puzzle, submitter_name } = await getTodaysVresTinFrasiPuzzle(TODAY);

    expect(puzzle.phrase).toBe("καλη χρονια");
    expect(puzzle.date).toBe(TODAY);
    expect(puzzle.id).toBe(`${TODAY}-vresi`);
    expect(submitter_name).toBe("Νίκος");
  });

  it("falls through to the static rotation when nothing is scheduled", async () => {
    nothingScheduled();
    const { puzzle, submitter_name } = await getTodaysVresTinFrasiPuzzle(TODAY);

    expect(puzzle.phrase).toBeTruthy();
    expect(submitter_name).toBeNull();
  });

  it("serves the same static phrase on every call for one date", async () => {
    nothingScheduled();
    const a = await getTodaysVresTinFrasiPuzzle(ARCHIVE);
    const b = await getTodaysVresTinFrasiPuzzle(ARCHIVE);
    expect(a.puzzle.phrase).toBe(b.puzzle.phrase);
  });

  it("gives two different dates their own static phrases", async () => {
    nothingScheduled();
    const a = await getTodaysVresTinFrasiPuzzle("2026-08-05");
    const b = await getTodaysVresTinFrasiPuzzle("2026-08-06");
    expect(a.puzzle.phrase).not.toBe(b.puzzle.phrase);
  });
});

// ── Leksiarxeio ───────────────────────────────────────────────────────────────

describe("getAllTodaysLeksiarxeioPuzzles", () => {
  it("serves the scheduled answers across all lengths, stamped with the date", async () => {
    scheduled({ "4": "ΓΑΤΑ", "5": "ΝΕΡΟΥ", "6": "ΣΠΙΤΙΑ", "7": "ΘΑΛΑΣΣΑ", "8": "ΠΑΡΑΘΥΡΟ" });
    const { puzzles, submitter_name } = await getAllTodaysLeksiarxeioPuzzles(TODAY);

    expect(puzzles).toHaveLength(LEKSIARXEIO_LENGTHS.length);
    expect(puzzles[0].date).toBe(TODAY);
    expect(puzzles[0].id).toBe(`${TODAY}-wordle-4`);
    // The loader lowercases the submitted answers.
    expect(puzzles[0].answer).toBe("γατα");
    expect(submitter_name).toBe("Νίκος");
  });

  it("falls through to the static answer pools when nothing is scheduled", async () => {
    nothingScheduled();
    const { puzzles, submitter_name } = await getAllTodaysLeksiarxeioPuzzles(ARCHIVE);

    // Independently recomputed from the pool the loader rotates over, not read
    // back from the loader's own arithmetic.
    const pool     = getAnswerPool(4);
    const expected = pool[dateToIndex(ARCHIVE, pool.length)];

    expect(puzzles[0].answer).toBe(expected);
    expect(submitter_name).toBeNull();
  });

  it("serves the same static answers on every call for one date", async () => {
    nothingScheduled();
    const a = await getAllTodaysLeksiarxeioPuzzles(ARCHIVE);
    const b = await getAllTodaysLeksiarxeioPuzzles(ARCHIVE);
    expect(a.puzzles.map((p) => p.answer)).toEqual(b.puzzles.map((p) => p.answer));
  });
});

// ── Leksindeseis ──────────────────────────────────────────────────────────────

describe("getTodaysLeksindeseisPuzzle", () => {
  it("serves the groups scheduled for that date, stamped with the date", async () => {
    const groups = allLeksindeseisPuzzles[0].groups;
    scheduled(groups);
    const { puzzle, submitter_name } = await getTodaysLeksindeseisPuzzle(TODAY);

    expect(puzzle?.date).toBe(TODAY);
    expect(puzzle?.groups).toEqual(groups);
    expect(submitter_name).toBe("Νίκος");
  });

  it("falls through to the static rotation when nothing is scheduled", async () => {
    nothingScheduled();
    const { puzzle, submitter_name } = await getTodaysLeksindeseisPuzzle(ARCHIVE);

    const expected = allLeksindeseisPuzzles[dateToIndex(ARCHIVE, allLeksindeseisPuzzles.length)];
    expect(puzzle?.groups).toEqual(expected.groups);
    expect(puzzle?.date).toBe(ARCHIVE);
    expect(submitter_name).toBeNull();
  });

  it("serves the same static puzzle on every call for one date", async () => {
    nothingScheduled();
    const a = await getTodaysLeksindeseisPuzzle(ARCHIVE);
    const b = await getTodaysLeksindeseisPuzzle(ARCHIVE);
    expect(a.puzzle?.groups).toEqual(b.puzzle?.groups);
  });
});
