// communityPuzzleScheduling.test.ts
// The data loader that serves a Community Puzzle — Leksindeseis — as seen from
// the page that calls it, plus the two loaders that no longer read the queue at
// all (Vres Tin Frasi and Leksiarxeio, ADR 0027).
//
// This is the regression surface for the scheduled-release defect (s134): the
// loaders each take a `date` but used to call consumeApprovedPuzzle() with no
// date at all, so ANY date requested — including an archive date reached through
// the leaderboard day-strip's ?puzzle= link — served whatever row sat at the head
// of the queue, and consuming DELETEd it. The date now reaches the query, and a
// date with nothing scheduled falls through to the deterministic static rotation.

import { beforeEach, describe, expect, it, vi } from "vitest";

import { dateToIndex } from "@/lib/puzzleRotation";

// ── consumeApprovedPuzzle mock (the loader's only DB dependency) ──────────────

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
  it("Leksindeseis asks for the date it was given, not today", async () => {
    nothingScheduled();
    await getTodaysLeksindeseisPuzzle(ARCHIVE);
    expect(consumeApprovedPuzzle).toHaveBeenCalledWith(
      "community_leksindeseis_puzzles",
      ARCHIVE,
    );
  });
});

// ── The two loaders that no longer consult the queue ──────────────────────────
// Λεξιαρχείο and Βρες τη Φράση lost Community Puzzle submission on 2026-08-20
// (ADR 0027). A call to consumeApprovedPuzzle from either would mean the read
// came back — and it would point at a table that no longer exists (dropped 2026-08-21).

describe("loaders with no community read", () => {
  it("Vres Tin Frasi never touches the queue", async () => {
    scheduled({ phrase: "καλη χρονια" });
    const { puzzle } = await getTodaysVresTinFrasiPuzzle(TODAY);

    expect(consumeApprovedPuzzle).not.toHaveBeenCalled();
    expect(puzzle.phrase).not.toBe("καλη χρονια");
  });

  it("Leksiarxeio never touches the queue", async () => {
    scheduled({ "4": "γατα", "5": "νερου", "6": "σπιτια", "7": "θαλασσα", "8": "παραθυρο" });
    const { puzzles } = await getAllTodaysLeksiarxeioPuzzles(TODAY);

    expect(consumeApprovedPuzzle).not.toHaveBeenCalled();
    expect(puzzles[0].answer).not.toBe("γατα");
  });
});

// ── Vres Tin Frasi ────────────────────────────────────────────────────────────

describe("getTodaysVresTinFrasiPuzzle", () => {
  it("serves the static rotation, stamped with the date it was given", async () => {
    const { puzzle } = await getTodaysVresTinFrasiPuzzle(TODAY);

    expect(puzzle.phrase).toBeTruthy();
    expect(puzzle.date).toBe(TODAY);
    expect(puzzle.id).toBe(`${TODAY}-vresi`);
  });

  it("serves the same static phrase on every call for one date", async () => {
    const a = await getTodaysVresTinFrasiPuzzle(ARCHIVE);
    const b = await getTodaysVresTinFrasiPuzzle(ARCHIVE);
    expect(a.puzzle.phrase).toBe(b.puzzle.phrase);
  });

  it("gives two different dates their own static phrases", async () => {
    const a = await getTodaysVresTinFrasiPuzzle("2026-08-05");
    const b = await getTodaysVresTinFrasiPuzzle("2026-08-06");
    expect(a.puzzle.phrase).not.toBe(b.puzzle.phrase);
  });
});

// ── Leksiarxeio ───────────────────────────────────────────────────────────────

describe("getAllTodaysLeksiarxeioPuzzles", () => {
  it("serves the static answer pools across all lengths, stamped with the date", async () => {
    const { puzzles } = await getAllTodaysLeksiarxeioPuzzles(ARCHIVE);

    // Independently recomputed from the pool the loader rotates over, not read
    // back from the loader's own arithmetic.
    const pool     = getAnswerPool(4);
    const expected = pool[dateToIndex(ARCHIVE, pool.length)];

    expect(puzzles).toHaveLength(LEKSIARXEIO_LENGTHS.length);
    expect(puzzles[0].date).toBe(ARCHIVE);
    expect(puzzles[0].id).toBe(`${ARCHIVE}-wordle-4`);
    expect(puzzles[0].answer).toBe(expected);
  });

  it("serves the same static answers on every call for one date", async () => {
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
