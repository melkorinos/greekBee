// POST /api/community-puzzles/leksindeseis — submit a community Leksindeseis puzzle.
// GET  /api/community-puzzles/leksindeseis?status=pending — list (admin only).
//
// A submission carries 4 groups of 4 words + a category name per group.
// Words are free-form (editorial judgment, no dictionary validation).
// Difficulty is inferred from submission order: group index 0 = difficulty 1 (easiest).
//
// Admin authentication: GET requires X-Admin-Secret header matching ADMIN_SECRET env var.

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "edge";

// ── POST ──────────────────────────────────────────────────────────────────────

interface SubmitGroup {
  category: string;
  words: [string, string, string, string];
}

interface SubmitPayload {
  submitter_name?: string;
  groups: SubmitGroup[]; // exactly 4, ordered easiest→hardest
}

export async function POST(req: NextRequest) {
  let body: SubmitPayload;
  try {
    body = (await req.json()) as SubmitPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { submitter_name = "", groups } = body;

  if (!Array.isArray(groups) || groups.length !== 4) {
    return NextResponse.json({ error: "Απαιτούνται ακριβώς 4 ομάδες" }, { status: 400 });
  }

  for (let i = 0; i < 4; i++) {
    const g = groups[i];
    if (!g?.category?.trim()) {
      return NextResponse.json({ error: `Ομάδα ${i + 1}: απαιτείται όνομα κατηγορίας` }, { status: 400 });
    }
    if (!Array.isArray(g.words) || g.words.length !== 4 || g.words.some((w) => !w?.trim())) {
      return NextResponse.json({ error: `Ομάδα ${i + 1}: απαιτούνται ακριβώς 4 λέξεις` }, { status: 400 });
    }
  }

  // Assign difficulty from order (1 = easiest, 4 = hardest)
  const data = groups.map((g, i) => ({
    category:   g.category.trim(),
    words:      g.words.map((w) => w.trim()) as [string, string, string, string],
    difficulty: (i + 1) as 1 | 2 | 3 | 4,
  }));

  const supabase = getSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("community_leksindeseis_puzzles") as any).insert({
    submitter_name: submitter_name.trim(),
    data,
    status: "pending",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// ── GET (admin) ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret") ?? "";
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const supabase = getSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("community_leksindeseis_puzzles") as any)
    .select("id, submitter_name, data, status, created_at")
    .eq("status", status)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ puzzles: data ?? [] });
}
