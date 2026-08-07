// identityMerge.test.ts — how Sign-in Restore executes the merge it has planned.
//
// The deciding is tested per-table in scoreMerge / achievementMerge /
// milestoneMerge. What is tested here is the executing: that all three lanes run,
// that each issues the statements its plan calls for and no others, and above all
// that the deletes go out BEFORE the re-point — the ordering that keeps game_scores'
// UNIQUE(game_id, device_id, puzzle_date) from rejecting a winning row as it lands
// on the identity whose loser has not been cleared yet.
//
// mergeIdentityRows takes its table accessor as an argument, so the whole module
// is exercised through a recording stub — no client factory to module-mock.

import { describe, expect, it } from "vitest";
import { mergeIdentityRows } from "@/lib/identityMerge";
import type { BoundTable } from "@/lib/supabase";

// ── Recording table accessor ──────────────────────────────────────────────────

interface Statement {
  table:   string;
  op:      "select" | "update" | "delete";
  /** The owner filter on a select, the payload on an update. */
  payload?: unknown;
  /** The id list on an update/delete. */
  ids?:     number[];
}

/**
 * Builds a BoundTable stub. `rows` maps "<table>::<owner>" to the rows a select
 * for that identity returns; every statement issued is appended to `log`.
 */
function makeDb(rows: Record<string, unknown[]>) {
  const log: Statement[] = [];

  const db = ((table: string) => {
    const st: Statement = { table, op: "select" };
    const chain: Record<string, unknown> = {};

    chain.select = () => chain;
    chain.update = (payload: unknown) => { st.op = "update"; st.payload = payload; return chain; };
    chain.delete = () => { st.op = "delete"; return chain; };
    chain.eq     = (_col: string, value: string) => {
      log.push(st);
      return Promise.resolve({ data: rows[`${table}::${value}`] ?? [], error: null });
    };
    chain.in     = (_col: string, ids: number[]) => {
      st.ids = ids;
      log.push(st);
      return Promise.resolve({ data: null, error: null });
    };

    return chain;
  }) as unknown as BoundTable;

  return { db, log };
}

/** The statements a lane issued, in order, minus its two identity reads. */
function writesTo(log: Statement[], table: string) {
  return log.filter((s) => s.table === table && s.op !== "select");
}

// ── All three lanes ───────────────────────────────────────────────────────────

describe("mergeIdentityRows — lane coverage", () => {
  it("reads both identities on every identity-keyed table", async () => {
    const { db, log } = makeDb({});
    await mergeIdentityRows(db, "old", "canon");

    const reads = log.filter((s) => s.op === "select").map((s) => s.table);
    expect(reads).toEqual([
      "game_scores",         "game_scores",
      "player_achievements", "player_achievements",
      "player_milestones",   "player_milestones",
    ]);
  });

  it("issues no writes for a lane with nothing to move", async () => {
    const { db, log } = makeDb({});
    await mergeIdentityRows(db, "old", "canon");
    expect(log.filter((s) => s.op !== "select")).toEqual([]);
  });
});

// ── Ordering: the constraint-safe sequence ────────────────────────────────────

describe("mergeIdentityRows — game_scores", () => {
  // The old device beat the canonical identity on the same puzzle. The canonical
  // row must be deleted before the old row is re-pointed onto it, or the UNIQUE
  // constraint rejects the update.
  const contested = {
    "game_scores::old":   [{ id: 1, game_id: "leksokipos", puzzle_date: "2026-07-01", score: 90 }],
    "game_scores::canon": [{ id: 2, game_id: "leksokipos", puzzle_date: "2026-07-01", score: 40 }],
  };

  it("deletes the beaten canonical row before re-pointing the winner onto it", async () => {
    const { db, log } = makeDb(contested);
    await mergeIdentityRows(db, "old", "canon");

    const writes = writesTo(log, "game_scores");
    expect(writes.map((s) => s.op)).toEqual(["delete", "update"]);
    expect(writes[0].ids).toEqual([2]);
    expect(writes[1].ids).toEqual([1]);
  });

  it("re-points onto device_id, the column game_scores keys identity on", async () => {
    const { db, log } = makeDb(contested);
    await mergeIdentityRows(db, "old", "canon");

    const update = writesTo(log, "game_scores").find((s) => s.op === "update");
    expect(update?.payload).toEqual({ device_id: "canon" });
  });

  it("deletes the old row instead when the canonical identity already scored higher", async () => {
    const { db, log } = makeDb({
      "game_scores::old":   [{ id: 1, game_id: "leksokipos", puzzle_date: "2026-07-01", score: 10 }],
      "game_scores::canon": [{ id: 2, game_id: "leksokipos", puzzle_date: "2026-07-01", score: 40 }],
    });
    await mergeIdentityRows(db, "old", "canon");

    const writes = writesTo(log, "game_scores");
    expect(writes.map((s) => s.op)).toEqual(["delete"]);
    expect(writes[0].ids).toEqual([1]);
  });
});

// ── The two set-union lanes ───────────────────────────────────────────────────

describe("mergeIdentityRows — set lanes", () => {
  it("carries over an achievement the canonical identity lacks and drops the duplicate", async () => {
    const { db, log } = makeDb({
      "player_achievements::old": [
        { id: 1, achievement_id: "leksokipos-stin-korifi" },
        { id: 2, achievement_id: "leksokipos-kynigos-pangram-chryso" },
      ],
      "player_achievements::canon": [{ id: 9, achievement_id: "leksokipos-stin-korifi" }],
    });
    await mergeIdentityRows(db, "old", "canon");

    const writes = writesTo(log, "player_achievements");
    expect(writes.find((s) => s.op === "delete")?.ids).toEqual([1]);
    expect(writes.find((s) => s.op === "update")?.ids).toEqual([2]);
    expect(writes.find((s) => s.op === "update")?.payload).toEqual({ device_uuid: "canon" });
  });

  it("dedups milestones on (puzzle_date, kind, detail), not on the word alone", async () => {
    const { db, log } = makeDb({
      "player_milestones::old": [
        // Same word, same day, different kind — a distinct milestone, so it moves.
        { id: 1, puzzle_date: "2026-07-06", kind: "word",    detail: "διακοπτησ" },
        { id: 2, puzzle_date: "2026-07-06", kind: "pangram", detail: "διακοπτησ" },
      ],
      "player_milestones::canon": [
        { id: 9, puzzle_date: "2026-07-06", kind: "word", detail: "διακοπτησ" },
      ],
    });
    await mergeIdentityRows(db, "old", "canon");

    const writes = writesTo(log, "player_milestones");
    expect(writes.find((s) => s.op === "delete")?.ids).toEqual([1]);
    expect(writes.find((s) => s.op === "update")?.ids).toEqual([2]);
  });

  it("never deletes a canonical row on a set lane — a set has no loser", async () => {
    const { db, log } = makeDb({
      "player_achievements::old":   [{ id: 1, achievement_id: "leksokipos-stin-korifi" }],
      "player_achievements::canon": [{ id: 9, achievement_id: "leksokipos-stin-korifi" }],
    });
    await mergeIdentityRows(db, "old", "canon");

    const deletes = writesTo(log, "player_achievements").filter((s) => s.op === "delete");
    expect(deletes.flatMap((s) => s.ids ?? [])).toEqual([1]);
  });
});
