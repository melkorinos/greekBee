// communityPuzzleLifecycle.ts — the Community Puzzle Lifecycle module.
//
// One implementation of the lifecycle shared by every /api/community-puzzles/*
// route: submit → pending → approve (UPDATE status) | reject (DELETE row).
// Per-game variation enters through CommunityPuzzleGameConfig:
//   - table:    which community_*_puzzles table backs the game
//   - validate: submission validation adapter — defined in the game's own
//     route file so heavy word-pool imports stay out of the other edge bundles
//   - select / listOrder / publicApprovedList / returnInsertedId: the
//     Stavrolekso differences (title column, newest-first browse list that is
//     public for status=approved, and the inserted id echoed back for the
//     creator's edit URL)
//
// Route files stay thin: declare a config, export the created handlers, and
// keep `export const runtime = "edge"` (Next.js reads it per route file).

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";

/** Result of a game's submission-validation adapter. */
export type SubmissionValidation =
  /** Row to insert — the module adds `status: "pending"`. */
  | { ok: true; row: Record<string, unknown> }
  /** Error response passed through verbatim (status + JSON body). */
  | { ok: false; status: number; body: Record<string, unknown> };

export interface CommunityPuzzleGameConfig {
  /** Supabase table backing this game's Community Puzzles. */
  table: string;
  /** Validation adapter: parsed request body → row to insert, or an error response. */
  validate: (body: unknown) => SubmissionValidation;
  /** Columns returned by the list endpoint. Default: id, submitter_name, data, status, created_at. */
  select?: string;
  /** created_at list order. Default "asc" — review-queue order, oldest first. */
  listOrder?: "asc" | "desc";
  /** When true, GET defaults to status=approved and only status=pending requires admin. */
  publicApprovedList?: boolean;
  /** When true, POST echoes the inserted row id (creator edit URL needs it). */
  returnInsertedId?: boolean;
}

const DEFAULT_SELECT = "id, submitter_name, data, status, created_at";

function isAdmin(req: NextRequest): boolean {
  const secret = req.headers.get("x-admin-secret") ?? "";
  return Boolean(secret) && secret === process.env.ADMIN_SECRET;
}

// ── POST (submit) ─────────────────────────────────────────────────────────────

export function createSubmitHandler(config: CommunityPuzzleGameConfig) {
  return async function POST(req: NextRequest) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const result = config.validate(body);
    if (!result.ok) {
      return NextResponse.json(result.body, { status: result.status });
    }

    const supabase = getSupabaseClient();
    const row = { ...result.row, status: "pending" };

    if (config.returnInsertedId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from(config.table) as any)
        .insert(row)
        .select("id")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, id: (data as { id: number }).id });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from(config.table) as any).insert(row);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  };
}

// ── GET (list) ────────────────────────────────────────────────────────────────

export function createListHandler(config: CommunityPuzzleGameConfig) {
  return async function GET(req: NextRequest) {
    const defaultStatus = config.publicApprovedList ? "approved" : "pending";
    const status = req.nextUrl.searchParams.get("status") ?? defaultStatus;

    // Admin-only throughout, except the public approved browse list:
    // there only the pending review queue stays behind the secret.
    const requiresAdmin = config.publicApprovedList ? status === "pending" : true;
    if (requiresAdmin && !isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from(config.table) as any)
      .select(config.select ?? DEFAULT_SELECT)
      .eq("status", status)
      .order("created_at", { ascending: (config.listOrder ?? "asc") === "asc" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ puzzles: data ?? [] });
  };
}

// ── PATCH (admin review) ──────────────────────────────────────────────────────

interface ReviewPayload {
  action: "approve" | "reject";
}

export function createReviewHandler(config: Pick<CommunityPuzzleGameConfig, "table">) {
  return async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    let body: ReviewPayload;
    try {
      body = (await req.json()) as ReviewPayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { action } = body;
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    if (action === "approve") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(config.table) as any)
        .update({ status: "approved" })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(config.table) as any)
        .delete()
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  };
}
