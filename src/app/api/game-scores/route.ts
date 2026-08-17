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

// `data` is written by the Leksiarxeio branch below and by nothing else. A standard
// game's POST cannot reach the column at all: the body is destructured field by
// field, so a client sending `data` — a stale bundle, or anyone with the anon key —
// has it ignored rather than sanitized. Leksokipos posted { words, pangrams } here
// until 2026-08-16; nothing ever read them back and the Offline Outbox flush omitted
// them, so the counts were a lossy record of a question no one was asking.
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
  const { score } = body as StandardScorePayload;
  if (typeof score !== "number") {
    return jsonMessage("Missing required fields");
  }

  const row: Insert<"game_scores"> = { game_id, puzzle_date, device_id, display_name: name, score };

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

  // ── Display name + badge, both resolved at read time ────────────────────────
  // One batched player_profiles lookup answers both: the current display name
  // (see resolveProfiles on why the row's own copy is only a fallback) and the
  // chosen badge — its selected_badge_id, plus for a tiered selection the
  // highest earned tier from player_achievements. Read-time resolution
  // self-heals across renames and tier upgrades alike.
  const profileByDevice = await resolveProfiles(
    supabase,
    playerData ? [...rawRows.map((r) => r.device_id), deviceId] : rawRows.map((r) => r.device_id),
  );

  const top20 = rawRows.map((r, i) => ({
    rank:         i + 1,
    display_name: profileByDevice.get(r.device_id)?.name ?? r.display_name,
    score:        r.score,
    isPlayer:     r.device_id === deviceId,
    badge:        profileByDevice.get(r.device_id)?.badge ?? null,
  }));

  const playerRow = playerData
    ? {
        rank:         playerRank,
        display_name: profileByDevice.get(deviceId)?.name ?? playerData.display_name,
        score:        playerData.score,
        isPlayer:     true as const,
        badge:        profileByDevice.get(deviceId)?.badge ?? null,
      }
    : null;

  return NextResponse.json({ top20, playerRow });
}

interface ResolvedProfile {
  /** Current name from player_profiles, or null when the device has no profile row. */
  name:  string | null;
  badge: DisplayBadge | null;
}

// Fetch the display name and resolve the display badge for each of `deviceIds`
// (deduped). Two index-backed `in()` queries at most — profiles for every device,
// then player_achievements only for the devices whose selection is a tiered badge.
//
// `name` is null for a device with no profile row, and the caller falls back to
// the game_scores row's own display_name copy. That fallback is load-bearing, not
// defensive: measured 2026-08-15, 19 of 52 scoring devices had never written a
// player_profiles row (a device only gets one once it sets a name or picks a
// badge), so resolving names *only* from profiles would blank those leaderboard
// entries. The stored copy is a name-at-score-time snapshot; the profile always
// wins when there is one, which is what keeps renames from going stale.
async function resolveProfiles(
  supabase: ReturnType<typeof getSupabaseClient>,
  deviceIds: string[],
): Promise<Map<string, ResolvedProfile>> {
  const resolved = new Map<string, ResolvedProfile>();
  const ids = [...new Set(deviceIds.filter(Boolean))];
  if (ids.length === 0) return resolved;

  const { data: profiles } = await table(supabase, "player_profiles")
    .select("device_uuid, display_name, selected_badge_id")
    .in("device_uuid", ids);

  const selectedByDevice = new Map<string, string>();
  type ProfileRow = { device_uuid: string; display_name: string | null; selected_badge_id: string | null };
  for (const p of (profiles as ProfileRow[] | null) ?? []) {
    const name = (p.display_name ?? "").trim();
    resolved.set(p.device_uuid, { name: name || null, badge: null });
    if (p.selected_badge_id) selectedByDevice.set(p.device_uuid, p.selected_badge_id);
  }
  if (selectedByDevice.size === 0) return resolved;

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
    if (badge) resolved.get(device)!.badge = badge;
  }
  return resolved;
}
