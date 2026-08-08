// Shared server-side upsert helper for score and game-state routes.
// Old-row cleanup is handled by the daily Vercel Cron at /api/cleanup-scores.

import { getSupabaseClient, table, type Insert, type TableName } from "@/lib/supabase";

export async function upsertAndClean<T extends TableName>(
  tableName:       T,
  conflictColumns: string,
  row:             Insert<T>,
): Promise<string | null> {
  const supabase = getSupabaseClient();

  // The row is checked against `tableName`'s real Insert type at the call site.
  // supabase-js cannot prove that for an unresolved T, so the payload is widened
  // here; T is pinned by the caller's literal, so nothing is lost.
  const { error } = await table(supabase, tableName).upsert(
    row as never,
    { onConflict: conflictColumns },
  );
  return error ? error.message as string : null;
}
