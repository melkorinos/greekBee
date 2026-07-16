// Shared server-side upsert helper for score and game-state routes.
// Old-row cleanup is handled by the daily Vercel Cron at /api/cleanup-scores.

import { getSupabaseClient, table } from "@/lib/supabase";

export async function upsertAndClean(
  tableName:       string,
  conflictColumns: string,
  row:             Record<string, unknown>,
): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { error } = await table(supabase, tableName).upsert(
    row,
    { onConflict: conflictColumns },
  );
  return error ? error.message as string : null;
}
