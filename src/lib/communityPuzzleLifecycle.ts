// communityPuzzleLifecycle.ts — the Community Puzzle Lifecycle module.
//
// One implementation of the lifecycle shared by every /api/community-puzzles/*
// route: submit → pending → approve (UPDATE status) | reject (DELETE row) →
// consume (claim the oldest approved row when a game serves its Daily Puzzle).
// Per-game variation enters through CommunityPuzzleGameConfig:
//   - table:    which community_*_puzzles table backs the game
//   - validate: submission validation adapter — a pure function in the game's
//     lib (src/games/<game>/lib/validateSubmission.ts), imported only by that
//     game's route so heavy word-pool imports stay out of the other edge bundles
//   - select / listOrder / publicApprovedList / returnInsertedId: the
//     Stavrolekso differences (title column, newest-first browse list that is
//     public for status=approved, and the inserted id echoed back for the
//     creator's edit URL)
//
// Route files stay thin: declare a config, export the created handlers, and
// keep `export const runtime = "edge"` (Next.js reads it per route file).

import { NextRequest, NextResponse } from "next/server";

import { jsonError, jsonMessage, parseJson, requireAdmin } from "@/lib/apiRoute";
import {
  getServiceRoleClient,
  getSupabaseClient,
  table,
  type Insert,
  type TableName,
} from "@/lib/supabase";

/**
 * The four tables this module drives. Narrower than TableName on purpose: the
 * lifecycle only makes sense for the community_* queues, so pointing a config
 * at (say) game_scores is a compile error rather than a runtime surprise.
 */
export type CommunityPuzzleTable = Extract<TableName, `community_${string}_puzzles`>;

/** Result of a game's submission-validation adapter. */
export type SubmissionValidation =
  /** Row to insert — the module adds `status: "pending"`. */
  | { ok: true; row: Record<string, unknown> }
  /** Error response passed through verbatim (status + JSON body). */
  | { ok: false; status: number; body: Record<string, unknown> };

export interface CommunityPuzzleGameConfig {
  /** Supabase table backing this game's Community Puzzles. */
  table: CommunityPuzzleTable;
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

// ── Consume (claim the next approved Community Puzzle) ──────────────────────────
// The fourth lifecycle transition. A game's data loader claims the oldest approved
// row (FIFO), deletes it so it is never served again, and receives the row's jsonb
// `data` blob plus submitter_name. Each loader maps the blob to its own Puzzle
// shape and owns its own static fallback when the queue is empty. Returns null on
// an empty queue or any error so the caller falls through to its fallback.
//
// Stavrolekso is excluded by design: its rows are never consumed (CONTEXT.md).

/** What a loader receives when it claims an approved Community Puzzle. */
export interface ConsumedPuzzle<TData> {
  /** The row's jsonb payload, shaped per game. */
  data:           TData;
  /** Submitter's display name, or null when blank. */
  submitter_name: string | null;
}

export async function consumeApprovedPuzzle<TData>(
  tableName: CommunityPuzzleTable,
): Promise<ConsumedPuzzle<TData> | null> {
  try {
    // Claiming an approved row DELETEs it — a privileged op the anon role has no
    // RLS policy for. Use the service-role client (server-only serve path).
    const supabase = getServiceRoleClient();
    const { data, error } = await table(supabase, tableName)
      .select("id, submitter_name, data")
      .eq("status", "approved")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (error || !data) return null;

    const row = data as { id: number; submitter_name: string | null; data: TData };

    // Delete immediately — consumed puzzles are never reused.
    await table(supabase, tableName).delete().eq("id", row.id);

    return { data: row.data, submitter_name: row.submitter_name || null };
  } catch {
    // Any error → caller falls through to its static fallback.
    return null;
  }
}

// ── POST (submit) ─────────────────────────────────────────────────────────────

export function createSubmitHandler(config: CommunityPuzzleGameConfig) {
  return async function POST(req: NextRequest) {
    const parsed = await parseJson<unknown>(req);
    if (!parsed.ok) return parsed.response;

    const result = config.validate(parsed.body);
    if (!result.ok) {
      return NextResponse.json(result.body, { status: result.status });
    }

    const supabase = getSupabaseClient();

    // The one place the schema types cannot reach. A game's validate() adapter
    // is a pure function in that game's lib and returns an untyped bag of
    // columns (SubmissionValidation.row) — the module deliberately knows nothing
    // about per-game puzzle shapes, which is what lets one lifecycle serve four
    // games. So the payload is widened here, at the single seam where an
    // adapter's output crosses into a typed query, rather than at the two
    // .insert() calls below. Cost of being wrong: a bad adapter surfaces as a
    // db_error at runtime instead of a compile error. Validation adapters are
    // unit-tested per game, which is where that shape is actually pinned down.
    const row = { ...result.row, status: "pending" } as Insert<CommunityPuzzleTable>;

    if (config.returnInsertedId) {
      const { data, error } = await table(supabase, config.table)
        .insert(row as never)
        .select("id")
        .single();
      if (error) return jsonError("db_error", error.message);
      return NextResponse.json({ ok: true, id: (data as { id: number }).id });
    }

    const { error } = await table(supabase, config.table).insert(row as never);
    if (error) return jsonError("db_error", error.message);
    return NextResponse.json({ ok: true });
  };
}

// ── GET (list) ────────────────────────────────────────────────────────────────

export function createListHandler(config: CommunityPuzzleGameConfig) {
  return async function GET(req: NextRequest) {
    const defaultStatus = config.publicApprovedList ? "approved" : "pending";
    const status = req.nextUrl.searchParams.get("status") ?? defaultStatus;

    // status is now a PG enum (community_puzzle_status), so the typed query
    // below only accepts the union — an arbitrary ?status= string no longer
    // flows into .eq() and answers an empty list; it is rejected here.
    if (status !== "pending" && status !== "approved") {
      return jsonMessage("status must be 'pending' or 'approved'");
    }

    // Admin-only throughout, except the public approved browse list:
    // there only the pending review queue stays behind the secret.
    const requiresAdmin = config.publicApprovedList ? status === "pending" : true;
    if (requiresAdmin) {
      const denied = requireAdmin(req);
      if (denied) return denied;
    }

    // Admin queues read non-public statuses (pending); several tables grant anon
    // no SELECT policy at all, so the admin path must use the service-role client.
    // The public approved-browse list stays on the anon client (RLS-guarded).
    const supabase = requiresAdmin ? getServiceRoleClient() : getSupabaseClient();
    const { data, error } = await table(supabase, config.table)
      .select(config.select ?? DEFAULT_SELECT)
      .eq("status", status)
      .order("created_at", { ascending: (config.listOrder ?? "asc") === "asc" });

    if (error) return jsonError("db_error", error.message);
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
    const denied = requireAdmin(req);
    if (denied) return denied;

    const { id } = await params;

    const parsed = await parseJson<ReviewPayload>(req);
    if (!parsed.ok) return parsed.response;

    const { action } = parsed.body;
    if (action !== "approve" && action !== "reject") {
      return jsonMessage("action must be 'approve' or 'reject'");
    }

    // approve UPDATEs status, reject DELETEs — neither is granted to anon by RLS
    // (INSERT-only). The admin secret is validated above, so use the service-role
    // client to persist the review.
    const supabase = getServiceRoleClient();

    // `id` arrives from the URL as a string; the column is a bigint. The old
    // untyped client shipped the string to PostgREST, which coerced it. Number()
    // makes the conversion explicit — garbage still lands in the same db_error
    // path (Postgres rejects "NaN" exactly as it rejected "abc").
    const rowId = Number(id);

    if (action === "approve") {
      const { error } = await table(supabase, config.table)
        .update({ status: "approved" })
        .eq("id", rowId);
      if (error) return jsonError("db_error", error.message);
    } else {
      const { error } = await table(supabase, config.table)
        .delete()
        .eq("id", rowId);
      if (error) return jsonError("db_error", error.message);
    }

    return NextResponse.json({ ok: true });
  };
}
