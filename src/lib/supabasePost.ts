// Shared server-side upsert + 7-day rolling cleanup for score routes.
// Callers provide the table name, conflict key, date field, and the row to upsert.
// Returns null on success, or an error message string on DB failure.

import { getSupabaseClient } from "@/lib/supabase";

export async function upsertAndClean(
  table:           string,
  conflictColumns: string,
  dateField:       string,
  row:             Record<string, unknown>,
): Promise<string | null> {
  const supabase = getSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table) as any).upsert(
    row,
    { onConflict: conflictColumns },
  );
  if (error) return error.message as string;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  void (supabase.from(table) as any).delete().lt(dateField, cutoffStr);

  return null;
}
