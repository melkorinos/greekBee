// GET   /api/community-puzzles/stavrolekso/[id] — fetch a single puzzle (public).
// PATCH /api/community-puzzles/stavrolekso/[id] — creator edit (PIN in body, pending only).

import { NextRequest, NextResponse } from "next/server";

import { jsonError, jsonMessage, parseJson } from "@/lib/apiRoute";
import {
  getServiceRoleClient,
  getSupabaseClient,
  table,
  type Json,
  type Update,
} from "@/lib/supabase";
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
    .eq("id", Number(id))
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

  // The PIN lookup is as privileged as the UPDATE below it. anon holds a SELECT
  // grant on the public browse columns only (migration 20260717120000) — asking
  // it for edit_pin is a hard 42501, because the column-level grant is what
  // keeps the PIN out of a direct PostgREST call. So this read is service-role
  // too, and the whole PATCH path stays off the anon client.
  const supabase = getServiceRoleClient();

  const { data: row, error: fetchError } = await table(supabase, "community_stavrolekso_puzzles")
    .select("status, edit_pin")
    .eq("id", Number(id))
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

  // `data` is a game-level shape (validated just above); the column is jsonb, so
  // the DB types it only as Json. The cast is that narrowing, made explicit.
  const updates: Update<"community_stavrolekso_puzzles"> = { data: data as unknown as Json };
  if (title !== undefined) updates.title = title?.trim() ?? null;
  if (submitter_name !== undefined) updates.submitter_name = submitter_name.trim();

  // The PIN check above is this route's whole authorisation, and it is server-side:
  // RLS cannot see the request's edit_pin, so anon has no UPDATE policy here (any
  // policy broad enough for this route would let the public anon key rewrite every
  // pending puzzle straight through PostgREST). The write privilege therefore has
  // to be server-side too — same reasoning as createReviewHandler's approve/reject.
  const { data: updated, error: updateError } = await table(
    supabase,
    "community_stavrolekso_puzzles",
  )
    .update(updates)
    .eq("id", Number(id))
    .select("id");

  if (updateError) return jsonError("db_error", updateError.message);
  // An UPDATE that matches no row is not an error — it returns an empty set. Reporting
  // ok:true there is what let this edit silently vanish for the creator; treat it as a
  // failure so the same bug can't come back quietly.
  if (!updated || updated.length === 0) return jsonError("db_error", "update affected no rows");
  return NextResponse.json({ ok: true });
}
