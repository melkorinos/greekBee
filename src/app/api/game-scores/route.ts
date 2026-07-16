// POST /api/game-scores — upsert a player's score for any game that uses game_scores
// GET  /api/game-scores?game_id=&puzzle_date=&deviceId= — top 20 + pinned player row
//
// Covers:
//   Leksokipos   (score = points, higher is better)
//   Leksindeseis (score = mistakesRemaining 1–4, higher is better)
//   Leksiarxeio  (score = sum of per-length in-game points 0–30, higher is better)
//                 POST carries word_length + points; the route reads the day's row,
//                 folds the length in via mergeLengthScore (pure — that fold is
//                 tested directly, not through a faked request), and writes it back.
//
// RLS: anon INSERT + anon SELECT + anon UPDATE (open leaderboard).
// Score de-duplication: unique constraint on (game_id, device_id, puzzle_date).

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient, table } from "@/lib/supabase";
import { isISODate } from "@/games/leksokipos/lib";
import { upsertAndClean } from "@/lib/supabasePost";
import { jsonError, jsonMessage, parseJson } from "@/lib/apiRoute";
import { LEKSIARXEIO } from "@/config/gameRules";
import { mergeLengthScore } from "@/lib/scoreMerge";
import { normalizePuzzleDate } from "@/lib/puzzleDate";
import { sanitizeDisplayName } from "@/lib/postScore";

export const runtime = "edge";

const VALID_WORD_LENGTHS = new Set<number>(LEKSIARXEIO.LENGTHS);

// ── POST ──────────────────────────────────────────────────────────────────────

interface StandardScorePayload {
  game_id:      string;
  puzzle_date:  string;
  device_id:    string;
  display_name: string;
  score:        number;
  is_perfect?:  boolean;
}

interface LeksiarxeioScorePayload {
  game_id:      "leksiarxeio";
  puzzle_date:  string;
  word_length:  number;
  device_id:    string;
  display_name: string;
  points:       number;
}

type ScorePayload = StandardScorePayload | LeksiarxeioScorePayload;

export async function POST(req: NextRequest) {
  const parsed = await parseJson<ScorePayload>(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const { game_id, puzzle_date: rawDate, device_id, display_name } = body;

  const puzzle_date = normalizePuzzleDate(rawDate);

  if (!game_id || !puzzle_date || !device_id) {
    return jsonMessage("Missing required fields");
  }
  if (!isISODate(puzzle_date)) {
    return jsonMessage("Invalid puzzle_date format");
  }

  const name = sanitizeDisplayName(display_name);

  // ── Leksiarxeio: read → fold → write, one length at a time ──────────────────
  if (game_id === "leksiarxeio") {
    const { word_length, points } = body as LeksiarxeioScorePayload;
    if (!VALID_WORD_LENGTHS.has(word_length)) {
      return jsonMessage("Invalid word_length");
    }
    if (typeof points !== "number" || points < 0 || points > 6) {
      return jsonMessage("points must be 0–6");
    }

    const supabase = getSupabaseClient();
    const { data: existing } = await table(supabase, "game_scores")
      .select("data")
      .eq("game_id", "leksiarxeio")
      .eq("device_id", device_id)
      .eq("puzzle_date", puzzle_date)
      .single();

    // The fold is pure and lives in scoreMerge — no row yet, or a length posting
    // twice, are decided there and tested there.
    const merged = mergeLengthScore(
      (existing as { data: Record<string, number> } | null)?.data,
      word_length,
      points,
    );

    const err = await upsertAndClean(
      "game_scores",
      "game_id,device_id,puzzle_date",
      { game_id, puzzle_date, device_id, display_name: name, score: merged.score, data: merged.data },
    );
    if (err) return jsonError("db_error", err);
    return NextResponse.json({ ok: true });
  }

  // ── Standard games ──────────────────────────────────────────────────────────
  const { score, is_perfect } = body as StandardScorePayload;
  if (typeof score !== "number") {
    return jsonMessage("Missing required fields");
  }

  const row: Record<string, unknown> = { game_id, puzzle_date, device_id, display_name: name, score };
  if (is_perfect === true) row.is_perfect = true;

  const err = await upsertAndClean(
    "game_scores",
    "game_id,device_id,puzzle_date",
    row,
  );
  if (err) return jsonError("db_error", err);
  return NextResponse.json({ ok: true });
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const gameId    = req.nextUrl.searchParams.get("game_id") ?? "";
  const puzzleDate = req.nextUrl.searchParams.get("puzzle_date") ?? "";
  const deviceId  = req.nextUrl.searchParams.get("deviceId") ?? "";
  // sort=asc for lower-is-better games. No game uses it today — every leaderboard
  // is higher-is-better and sorts desc (ADR 0014) — but the param stays generic.
  const sortAsc   = req.nextUrl.searchParams.get("sort") === "asc";

  if (!gameId || !puzzleDate) {
    return jsonMessage("game_id and puzzle_date are required");
  }

  const supabase = getSupabaseClient();

  const { data: rows, error } = await table(supabase, "game_scores")
    .select("device_id, display_name, score, is_perfect")
    .eq("game_id", gameId)
    .eq("puzzle_date", puzzleDate)
    .order("score", { ascending: sortAsc })
    .limit(20);

  if (error) {
    return jsonError("db_error", error.message);
  }

  interface RawRow { device_id: string; display_name: string; score: number; is_perfect: boolean; }
  const rawRows: RawRow[] = (rows as RawRow[]) ?? [];

  const top20 = rawRows.map((r, i) => ({
    rank:         i + 1,
    display_name: r.display_name,
    score:        r.score,
    is_perfect:   r.is_perfect ?? false,
    isPlayer:     r.device_id === deviceId,
  }));

  const playerInTop20 = top20.some((r) => r.isPlayer);

  let playerRow: {
    rank:         number;
    display_name: string;
    score:        number;
    is_perfect:   boolean;
    isPlayer:     true;
  } | null = null;

  if (!playerInTop20 && deviceId) {
    const { data: playerData } = await table(supabase, "game_scores")
      .select("display_name, score, is_perfect")
      .eq("game_id", gameId)
      .eq("puzzle_date", puzzleDate)
      .eq("device_id", deviceId)
      .single();

    if (playerData) {
      // Count players who rank ahead of this player.
      // For ascending sort (lower=better), count those with a lower score.
      // For descending sort (higher=better), count those with a higher score.
      const { count } = await table(supabase, "game_scores")
        .select("*", { count: "exact", head: true })
        .eq("game_id", gameId)
        .eq("puzzle_date", puzzleDate)
        [sortAsc ? "lt" : "gt"]("score", playerData.score as number);

      playerRow = {
        rank:         (count ?? 0) + 1,
        display_name: playerData.display_name as string,
        score:        playerData.score as number,
        is_perfect:   (playerData.is_perfect as boolean) ?? false,
        isPlayer:     true,
      };
    }
  }

  return NextResponse.json({ top20, playerRow });
}
