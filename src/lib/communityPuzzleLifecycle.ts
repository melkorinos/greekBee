// communityPuzzleLifecycle.ts — the Community Puzzle Lifecycle module.
//
// One implementation of the lifecycle shared by every /api/community-puzzles/*
// route: submit → pending → approve (UPDATE status + assign a scheduled_date) |
// reject (DELETE row) → serve (read the approved row scheduled for the date a
// game is rendering, leaving the row in place).
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
import { nextFreeScheduledDate, todayISO } from "@/lib/puzzleDate";
import {
  getServiceRoleClient,
  getSupabaseClient,
  table,
  type Insert,
  type TableName,
} from "@/lib/supabase";

/**
 * Every community queue table, derived from TableName rather than listed — add
 * or drop a `community_*_puzzles` table and this narrows on its own. Narrower
 * than TableName on purpose: the lifecycle only makes sense for those queues, so
 * pointing a config at (say) game_scores is a compile error rather than a
 * runtime surprise.
 */
export type CommunityPuzzleTable = Extract<TableName, `community_${string}_puzzles`>;

/**
 * The queues that actually serve a Daily Puzzle, and so carry a
 * `scheduled_date` — Λεξινδέσεις alone since Λεξιαρχείο and Βρες τη Φράση lost
 * submission (ADR 0027). Stavrolekso is excluded structurally rather than by
 * convention: its rows are never consumed (players browse the whole approved
 * pool), it has no release date, and the column does not exist on its table —
 * so pointing the schedule-aware paths at it is a compile error.
 */
export type ScheduledPuzzleTable = Exclude<
  CommunityPuzzleTable,
  "community_stavrolekso_puzzles"
>;

/** Narrows a community table to one that carries a release date. */
function isScheduledTable(t: CommunityPuzzleTable): t is ScheduledPuzzleTable {
  return t !== "community_stavrolekso_puzzles";
}

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

// ── Consume (serve the Community Puzzle scheduled for a date) ───────────────────
// The fourth lifecycle transition. A game's data loader reads the approved row
// scheduled for the date being served and receives the row's jsonb `data` blob
// plus submitter_name. Each loader maps the blob to its own Puzzle shape and owns
// its own static fallback when no row is scheduled. Returns null on a miss or any
// error so the caller falls through to that fallback.
//
// This is a pure READ — deliberately non-destructive. It used to claim the oldest
// approved row FIFO and DELETE it, ignoring the date entirely; because the loaders
// run on every page load, that made a refresh destroy a puzzle permanently, served
// two players on the same day different puzzles, and let any archive date drain the
// queue. A puzzle is now pinned to its scheduled_date and served from there for as
// long as the row lives.
//
// Past dates never match a future-only schedule, so they fall through to the
// deterministic static rotation — replaying an already-consumed community puzzle is
// not supported (those rows are gone).
//
// Stavrolekso is excluded by design: its rows are never consumed (CONTEXT.md).

/** What a loader receives when it serves a scheduled Community Puzzle. */
export interface ConsumedPuzzle<TData> {
  /** The row's jsonb payload, shaped per game. */
  data:           TData;
  /** Submitter's display name, or null when blank. */
  submitter_name: string | null;
}

export async function consumeApprovedPuzzle<TData>(
  tableName: ScheduledPuzzleTable,
  date: string,
): Promise<ConsumedPuzzle<TData> | null> {
  try {
    // Several community tables grant anon no SELECT policy at all, so the serve
    // path (server-only) reads with the service-role client.
    const supabase = getServiceRoleClient();
    const { data, error } = await table(supabase, tableName)
      .select("id, submitter_name, data, scheduled_date")
      .eq("status", "approved")
      .eq("scheduled_date", date)
      .limit(1)
      .single();

    if (error || !data) return null;

    // `data` is jsonb, so the DB types it as Json; the per-game shape is the
    // caller's TData. Same seam as the submit path's Insert widening — the row
    // shape is pinned by each game's loader tests, not by this module.
    const row = data as unknown as { id: number; submitter_name: string | null; data: TData };

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
  /**
   * Optional admin override for the release date (YYYY-MM-DD, strictly future).
   * Omitted on the normal path, where approval auto-assigns the earliest free
   * future date.
   */
  scheduled_date?: unknown;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

    const { action, scheduled_date: override } = parsed.body;
    if (action !== "approve" && action !== "reject") {
      return jsonMessage("action must be 'approve' or 'reject'");
    }

    // An override is validated before any DB work: a date column will happily
    // reject garbage, but that surfaces as an opaque db_error, and a past date
    // is well-formed SQL for a puzzle nobody can ever play.
    const today = todayISO();
    if (action === "approve" && override !== undefined && override !== null) {
      if (typeof override !== "string" || !ISO_DATE_RE.test(override)) {
        return jsonMessage("scheduled_date must be a YYYY-MM-DD date");
      }
      if (override <= today) {
        return jsonMessage("scheduled_date must be a future date");
      }
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
      // Stavrolekso approvals are permanent and undated — its rows are never
      // consumed, so it has no scheduled_date column and skips this entirely.
      if (!isScheduledTable(config.table)) {
        const { error } = await table(supabase, config.table)
          .update({ status: "approved" })
          .eq("id", rowId);
        if (error) return jsonError("db_error", error.message);
        return NextResponse.json({ ok: true });
      }

      // Approval is where a Daily Puzzle gets its release date. Auto-assign the
      // earliest free future date unless the admin named one; the read of taken
      // dates is admin-only and runs once per review, so it is not on any player
      // hotpath.
      const scheduledTable = config.table;
      let scheduledDate = override as string | undefined;
      if (!scheduledDate) {
        const { data: booked, error: readError } = await table(supabase, scheduledTable)
          .select("scheduled_date")
          .eq("status", "approved");
        if (readError) return jsonError("db_error", readError.message);

        const taken = ((booked ?? []) as unknown as { scheduled_date: string | null }[])
          .map((r) => r.scheduled_date);
        scheduledDate = nextFreeScheduledDate(taken, today);
      }

      const { error } = await table(supabase, scheduledTable)
        .update({ status: "approved", scheduled_date: scheduledDate })
        .eq("id", rowId);
      if (error) return jsonError("db_error", error.message);

      return NextResponse.json({ ok: true, scheduled_date: scheduledDate });
    } else {
      const { error } = await table(supabase, config.table)
        .delete()
        .eq("id", rowId);
      if (error) return jsonError("db_error", error.message);
    }

    return NextResponse.json({ ok: true });
  };
}
