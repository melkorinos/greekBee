// GET   /api/community-puzzles/stavrolekso/[id] — fetch a single puzzle (public).
// PATCH /api/community-puzzles/stavrolekso/[id] — creator edit (PIN in body, pending only).

import { NextRequest, NextResponse } from "next/server";

import { jsonError, jsonMessage, parseJson } from "@/lib/apiRoute";
import { getSupabaseClient, table } from "@/lib/supabase";
import { validateStavroleksoData } from "@/games/stavrolekso/lib/validateSubmission";
import type { StavroleksoPuzzleData } from "@/games/stavrolekso/types";

export const runtime = "edge";

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = getSupabaseClient();

  const { data, error } = await table(supabase, "community_stavrolekso_puzzles")
    .select("id, title, submitter_name, data, status, created_at")
    .eq("id", id)
    .single();

  if (error || !data) return jsonError("not_found", error?.message);
  return NextResponse.json({ puzzle: data });
}

// ── PATCH (creator edit) ──────────────────────────────────────────────────────

interface EditPayload {
  edit_pin: string;
  data: StavroleksoPuzzleData;
  title?: string;
  submitter_name?: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const parsed = await parseJson<EditPayload>(req);
  if (!parsed.ok) return parsed.response;

  const { edit_pin, data, title, submitter_name } = parsed.body;

  if (!edit_pin) return jsonMessage("edit_pin required");

  const supabase = getSupabaseClient();

  const { data: row, error: fetchError } = await table(supabase, "community_stavrolekso_puzzles")
    .select("status, edit_pin")
    .eq("id", id)
    .single();

  if (fetchError || !row) return jsonError("not_found", fetchError?.message);

  const existing = row as { status: string; edit_pin: string };

  // Both 403s are the creator's own explanation of why their edit bounced (ADR
  // 0005) — copy the maker renders, not an auth code.
  if (existing.status !== "pending") {
    return jsonMessage("Puzzle is no longer editable", 403);
  }
  if (existing.edit_pin !== edit_pin) {
    return jsonMessage("Incorrect PIN", 403);
  }

  // An edit must clear the same bar as a submission — same invariants, one module.
  const dataError = validateStavroleksoData(data);
  if (dataError) {
    return jsonMessage(dataError);
  }

  const updates: Record<string, unknown> = { data };
  if (title !== undefined) updates.title = title?.trim() ?? null;
  if (submitter_name !== undefined) updates.submitter_name = submitter_name.trim();

  const { error: updateError } = await table(supabase, "community_stavrolekso_puzzles")
    .update(updates)
    .eq("id", id);

  if (updateError) return jsonError("db_error", updateError.message);
  return NextResponse.json({ ok: true });
}
