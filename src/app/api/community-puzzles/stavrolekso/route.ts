// POST /api/community-puzzles/stavrolekso — submit a new community crossword.
// GET  /api/community-puzzles/stavrolekso?status=approved — public approved list (landing page).
// GET  /api/community-puzzles/stavrolekso?status=pending  — admin list (X-Admin-Secret required).

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";
import type { StavroleksoPuzzleData } from "@/games/stavrolekso/types";

export const runtime = "edge";

// ── POST ──────────────────────────────────────────────────────────────────────

interface SubmitPayload {
  title?: string;
  submitter_name?: string;
  edit_pin: string;
  data: StavroleksoPuzzleData;
}

export async function POST(req: NextRequest) {
  let body: SubmitPayload;
  try {
    body = (await req.json()) as SubmitPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, submitter_name = "", edit_pin, data } = body;

  if (!edit_pin || typeof edit_pin !== "string" || !/^[a-zA-Z0-9]{4,8}$/.test(edit_pin)) {
    return NextResponse.json({ error: "edit_pin must be 4–8 alphanumeric characters" }, { status: 400 });
  }

  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "data is required" }, { status: 400 });
  }

  if (![9, 13, 15].includes(data.width) || data.width !== data.height) {
    return NextResponse.json({ error: "Grid must be square: 9×9, 13×13, or 15×15" }, { status: 400 });
  }

  if (!Array.isArray(data.slots) || data.slots.length === 0) {
    return NextResponse.json({ error: "Puzzle must have at least one slot" }, { status: 400 });
  }

  const hasAcross = data.slots.some((s) => s.direction === "across");
  const hasDown   = data.slots.some((s) => s.direction === "down");
  if (!hasAcross || !hasDown) {
    return NextResponse.json({ error: "Puzzle must have at least one Οριζόντια and one Κάθετα slot" }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase.from("community_stavrolekso_puzzles") as any)
    .insert({
      title:          title?.trim() ?? null,
      submitter_name: submitter_name.trim(),
      edit_pin,
      data,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: (row as { id: number }).id });
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? "approved";

  if (status === "pending") {
    const secret = req.headers.get("x-admin-secret") ?? "";
    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = getSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("community_stavrolekso_puzzles") as any)
    .select("id, title, submitter_name, data, status, created_at")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ puzzles: data ?? [] });
}
