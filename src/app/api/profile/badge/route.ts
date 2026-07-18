// POST /api/profile/badge — set (or clear) a player's display badge (Handoff B)
// GET  /api/profile/badge?device_uuid= — the device's current selected_badge_id
//
// A player picks ONE earned achievement in the Trophy Case; that badge renders
// beside their name on every leaderboard. What is STORED is the BASE achievement
// id (never a tier id) in player_profiles.selected_badge_id; the displayed tier is
// resolved at read time by the leaderboard GET (ADR 0013 self-healing).
//
// Ownership is validated HERE, in code, not by RLS: the id must be a real catalog
// badge AND the device must hold an earned player_achievements row for it (any tier
// id counts for a tiered badge) — no fake prestige via curl. Because the check is
// server-side, the write uses the service-role client (same stance the constraint
// note in the handoff calls for). Picking the badge lazily creates the profile row
// (display_name is NOT NULL, so a fresh row gets the default name), matching how a
// row is otherwise born; null clears the selection.

import { NextRequest, NextResponse } from "next/server";

import { jsonError, jsonMessage, parseJson } from "@/lib/apiRoute";
import { getServiceRoleClient, table } from "@/lib/supabase";
import { SELECTABLE_BADGE_IDS, qualifyingEarnedIds } from "@/games/leksokipos/lib/achievements";

export const runtime = "edge";

// ── POST — set / clear the display badge ──────────────────────────────────────

interface BadgePayload {
  device_uuid:       string;
  /** Base achievement id to display, or null to clear. */
  selected_badge_id: string | null;
}

export async function POST(req: NextRequest) {
  const parsed = await parseJson<BadgePayload>(req);
  if (!parsed.ok) return parsed.response;

  const { device_uuid, selected_badge_id } = parsed.body;

  if (!device_uuid) {
    return jsonMessage("device_uuid is required");
  }
  // null clears; a string selects. undefined (field absent) is a bad request —
  // clearing must send null explicitly so it can't happen by accident.
  if (selected_badge_id !== null && typeof selected_badge_id !== "string") {
    return jsonMessage("selected_badge_id is required (a badge id, or null to clear)");
  }

  const supabase = getServiceRoleClient();

  // ── Ownership gate (only when selecting, not clearing) ──────────────────────
  if (selected_badge_id !== null) {
    if (!SELECTABLE_BADGE_IDS.has(selected_badge_id)) {
      return jsonMessage("Unknown badge");
    }
    const { data: owned, error: ownErr } = await table(supabase, "player_achievements")
      .select("id")
      .eq("device_uuid", device_uuid)
      .in("achievement_id", qualifyingEarnedIds(selected_badge_id))
      .limit(1);
    if (ownErr) return jsonError("db_error", ownErr.message);
    if (!owned || (owned as unknown[]).length === 0) {
      return jsonMessage("Badge not earned", 403);
    }
  }

  // ── Write: update in place, lazily inserting the profile row on first pick ──
  const { data: updated, error: updErr } = await table(supabase, "player_profiles")
    .update({ selected_badge_id })
    .eq("device_uuid", device_uuid)
    .select("id");
  if (updErr) return jsonError("db_error", updErr.message);

  const rowExisted = Array.isArray(updated) && updated.length > 0;
  if (!rowExisted && selected_badge_id !== null) {
    const { error: insErr } = await table(supabase, "player_profiles")
      .insert({ device_uuid, display_name: "Ανώνυμος", selected_badge_id });
    if (insErr) return jsonError("db_error", insErr.message);
  }

  return NextResponse.json({ ok: true });
}

// ── GET — current selection ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const device_uuid = req.nextUrl.searchParams.get("device_uuid") ?? "";
  if (!device_uuid) {
    return jsonMessage("device_uuid is required");
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await table(supabase, "player_profiles")
    .select("selected_badge_id")
    .eq("device_uuid", device_uuid)
    .maybeSingle();

  if (error) return jsonError("db_error", error.message);

  const selected = (data as { selected_badge_id: string | null } | null)?.selected_badge_id ?? null;
  return NextResponse.json({ selected_badge_id: selected });
}
