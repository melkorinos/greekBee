// GET   /api/community-puzzles/stavrolekso/[id] — fetch a single puzzle (public).
// PATCH /api/community-puzzles/stavrolekso/[id] — creator edit (PIN in body, pending only).

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("community_stavrolekso_puzzles") as any)
    .select("id, title, submitter_name, data, status, created_at")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  let body: EditPayload;
  try {
    body = (await req.json()) as EditPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { edit_pin, data, title, submitter_name } = body;

  if (!edit_pin) return NextResponse.json({ error: "edit_pin required" }, { status: 400 });

  const supabase = getSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error: fetchError } = await (supabase.from("community_stavrolekso_puzzles") as any)
    .select("status, edit_pin")
    .eq("id", id)
    .single();

  if (fetchError || !row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = row as { status: string; edit_pin: string };

  if (existing.status !== "pending") {
    return NextResponse.json({ error: "Puzzle is no longer editable" }, { status: 403 });
  }
  if (existing.edit_pin !== edit_pin) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  }

  // An edit must clear the same bar as a submission — same invariants, one module.
  const dataError = validateStavroleksoData(data);
  if (dataError) {
    return NextResponse.json({ error: dataError }, { status: 400 });
  }

  const updates: Record<string, unknown> = { data };
  if (title !== undefined) updates.title = title?.trim() ?? null;
  if (submitter_name !== undefined) updates.submitter_name = submitter_name.trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from("community_stavrolekso_puzzles") as any)
    .update(updates)
    .eq("id", id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
