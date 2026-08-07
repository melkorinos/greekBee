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

import { getSupabaseClient, table, type Insert } from "@/lib/supabase";
import { upsertAndClean } from "@/lib/supabasePost";
import { jsonError, jsonMessage, parseJson } from "@/lib/apiRoute";
import { LEKSIARXEIO } from "@/config/gameRules";
import { mergeLengthScore } from "@/lib/scoreMerge";
import { isISODate, normalizePuzzleDate } from "@/lib/puzzleDate";
import { sanitizeDisplayName } from "@/lib/postScore";
import {
  achievementById,
  resolveDisplayBadge,
  type DisplayBadge,
} from "@/games/leksokipos/lib/achievements";

export const runtime = "edge";

const VALID_WORD_LENGTHS = new Set<number>(LEKSIARXEIO.LENGTHS);

// ── POST ──────────────────────────────────────────────────────────────────────

interface StandardScorePayload {
  game_id:      string;
  puzzle_date:  string;
  device_id:    string;
  display_name: string;
  score:        number;
  // Optional per-game metadata (e.g. Leksokipos { words, pangrams }) stored in the
  // row's jsonb. Counts only — never the word list (game_scores is public-read).
  data?:        Record<string, number>;
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

// The optional `data` blob is client-supplied and lands in a public-read jsonb, so
// only accept a flat object whose values are all finite numbers (word/pangram counts).
// Anything else — nested objects, strings, an attempt to smuggle the word list — is dropped.
export function isCountRecord(data: unknown): data is Record<string, number> {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return false;
  const values = Object.values(data);
  return values.length > 0 && values.every((v) => typeof v === "number" && Number.isFinite(v));
}

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
  const { score, data } = body as StandardScorePayload;
  if (typeof score !== "number") {
    return jsonMessage("Missing required fields");
  }

  const row: Insert<"game_scores"> = { game_id, puzzle_date, device_id, display_name: name, score };
  if (isCountRecord(data)) row.data = data;

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
    .select("device_id, display_name, score")
    .eq("game_id", gameId)
    .eq("puzzle_date", puzzleDate)
    .order("score", { ascending: sortAsc })
    .limit(20);

  if (error) {
    return jsonError("db_error", error.message);
  }

  interface RawRow { device_id: string; display_name: string; score: number; }
  const rawRows: RawRow[] = (rows as RawRow[]) ?? [];

  const playerInTop20 = rawRows.some((r) => r.device_id === deviceId);

  let playerData: { display_name: string; score: number } | null = null;
  let playerRank = 0;

  if (!playerInTop20 && deviceId) {
    const { data } = await table(supabase, "game_scores")
      .select("display_name, score")
      .eq("game_id", gameId)
      .eq("puzzle_date", puzzleDate)
      .eq("device_id", deviceId)
      .single();

    if (data) {
      playerData = data as { display_name: string; score: number };
      // Count players who rank ahead of this player.
      // For ascending sort (lower=better), count those with a lower score.
      // For descending sort (higher=better), count those with a higher score.
      const { count } = await table(supabase, "game_scores")
        .select("*", { count: "exact", head: true })
        .eq("game_id", gameId)
        .eq("puzzle_date", puzzleDate)
        [sortAsc ? "lt" : "gt"]("score", playerData.score);
      playerRank = (count ?? 0) + 1;
    }
  }

  // ── Display badges (Handoff B) ──────────────────────────────────────────────
  // Resolve each returned device's chosen badge: its selected_badge_id from
  // player_profiles, and — for a tiered selection — its highest earned tier from
  // player_achievements. Read-time resolution self-heals across tier upgrades.
  const badgeByDevice = await resolveBadges(
    supabase,
    playerData ? [...rawRows.map((r) => r.device_id), deviceId] : rawRows.map((r) => r.device_id),
  );

  const top20 = rawRows.map((r, i) => ({
    rank:         i + 1,
    display_name: r.display_name,
    score:        r.score,
    isPlayer:     r.device_id === deviceId,
    badge:        badgeByDevice.get(r.device_id) ?? null,
  }));

  const playerRow = playerData
    ? {
        rank:         playerRank,
        display_name: playerData.display_name,
        score:        playerData.score,
        isPlayer:     true as const,
        badge:        badgeByDevice.get(deviceId) ?? null,
      }
    : null;

  return NextResponse.json({ top20, playerRow });
}

// Fetch and resolve the display badge for each of `deviceIds` (deduped). Two
// index-backed `in()` queries at most — profiles for every device, then
// player_achievements only for the devices whose selection is a tiered badge.
async function resolveBadges(
  supabase: ReturnType<typeof getSupabaseClient>,
  deviceIds: string[],
): Promise<Map<string, DisplayBadge>> {
  const badges = new Map<string, DisplayBadge>();
  const ids = [...new Set(deviceIds.filter(Boolean))];
  if (ids.length === 0) return badges;

  const { data: profiles } = await table(supabase, "player_profiles")
    .select("device_uuid, selected_badge_id")
    .in("device_uuid", ids);

  const selectedByDevice = new Map<string, string>();
  for (const p of (profiles as { device_uuid: string; selected_badge_id: string | null }[] | null) ?? []) {
    if (p.selected_badge_id) selectedByDevice.set(p.device_uuid, p.selected_badge_id);
  }
  if (selectedByDevice.size === 0) return badges;

  // Which selections are tiered? Those need the earned tier rows to resolve.
  const tieredDevices: string[] = [];
  const tierIds = new Set<string>();
  for (const [device, badgeId] of selectedByDevice) {
    const a = achievementById(badgeId);
    if (a?.tiers) {
      tieredDevices.push(device);
      for (const t of a.tiers) tierIds.add(t.id);
    }
  }

  const earnedByDevice = new Map<string, string[]>();
  if (tierIds.size > 0) {
    const { data: earned } = await table(supabase, "player_achievements")
      .select("device_uuid, achievement_id")
      .in("device_uuid", tieredDevices)
      .in("achievement_id", [...tierIds]);
    for (const e of (earned as { device_uuid: string; achievement_id: string }[] | null) ?? []) {
      (earnedByDevice.get(e.device_uuid) ?? earnedByDevice.set(e.device_uuid, []).get(e.device_uuid)!)
        .push(e.achievement_id);
    }
  }

  for (const [device, badgeId] of selectedByDevice) {
    const badge = resolveDisplayBadge(badgeId, earnedByDevice.get(device) ?? []);
    if (badge) badges.set(device, badge);
  }
  return badges;
}
