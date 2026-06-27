// Shared server-side upsert helper for score and game-state routes.
// Old-row cleanup is handled by the daily Vercel Cron at /api/cleanup-scores.

import { getSupabaseClient } from "@/lib/supabase";

export async function upsertAndClean(
  table:           string,
  conflictColumns: string,
  row:             Record<string, unknown>,
): Promise<string | null> {
  const supabase = getSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table) as any).upsert(
    row,
    { onConflict: conflictColumns },
  );
  return error ? error.message as string : null;
}
