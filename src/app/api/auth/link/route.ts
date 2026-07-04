// POST /api/auth/link — links a DeviceId to the signed-in Google account.
//
// Security boundary (ADR 0012 §6): auth_user_id is derived from the verified
// Supabase JWT (Authorization: Bearer <access_token>), never from the request
// body. The body supplies only device_uuid (the caller's own device). This is
// account-takeover territory, so the platform's relaxed trust model does not
// apply here — a missing or invalid token is rejected with 401.
//
// On sign-in it upserts player_profiles: sets auth_user_id on the device's row,
// creating it if absent, and pre-populates display_name from the verified Google
// identity when the player has none set. game_scores is keyed on device_id alone
// (it carries no auth_user_id column) so nothing there needs stamping — the
// device→account map lives solely in player_profiles.
//
// Privileged writes go through the service-role client (bypasses RLS, which has
// no DELETE policy on player_profiles and scopes UPDATE to auth.uid()).
//
// Idempotent — safe to call on every sign-in.

import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient, getSupabaseClient } from "@/lib/supabase";
import { planScoreMerge, type MergeRow } from "@/lib/scoreMerge";

export const runtime = "edge";

interface LinkPayload {
  device_uuid: string;
}

export async function POST(req: NextRequest) {
  // 1. Verify the JWT and derive the auth identity server-side.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const { data: { user }, error: authError } = await getSupabaseClient().auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const auth_user_id = user.id;
  const googleName = (user.user_metadata?.["full_name"] as string | undefined) ?? null;

  // 2. device_uuid is the only body field — the caller's own device to link.
  let body: LinkPayload;
  try {
    body = (await req.json()) as LinkPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { device_uuid } = body;
  if (!device_uuid) {
    return NextResponse.json({ error: "device_uuid is required" }, { status: 400 });
  }

  const supabase = getServiceRoleClient();

  // Bind `from` to the client: supabase-js's from() reads `this.rest`, so a
  // detached `supabase.from` reference (ESM strict mode → this === undefined)
  // throws "Cannot read properties of undefined (reading 'rest')". The `as any`
  // keeps the dynamic table-name calls below untyped.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase.from.bind(supabase) as any;

  // 3. Is this auth account already anchored to a profile? The unique partial
  //    index on player_profiles.auth_user_id guarantees at most one.
  const { data: anchor } = await db("player_profiles")
    .select("device_uuid, display_name")
    .eq("auth_user_id", auth_user_id)
    .maybeSingle() as { data: { device_uuid: string; display_name: string } | null };

  // 4. Sign-in Restore: the account lives on another device — adopt it and merge
  //    this device's history into it (ADR 0012).
  if (anchor && anchor.device_uuid !== device_uuid) {
    return await restore(db, device_uuid, anchor);
  }

  // 5. Fetch existing profile to check display_name and the currently mapped account.
  const { data: existing } = await db("player_profiles")
    .select("display_name, auth_user_id")
    .eq("device_uuid", device_uuid)
    .maybeSingle() as { data: { display_name: string; auth_user_id?: string | null } | null };

  // Use the verified Google name only when the player has no name yet.
  const nameToUse =
    existing?.display_name?.trim()
      ? existing.display_name
      : (googleName?.trim() || "Ανώνυμος");

  // 6. Upsert profile row — set auth_user_id + ensure display_name is populated.
  const { error: profileError } = await db("player_profiles").upsert(
    { device_uuid, auth_user_id, display_name: nameToUse },
    { onConflict: "device_uuid" }
  );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // 7. Audit the mapping change (ADR 0012): append an identity_audit row only
  //    when this link established a pair the profile row didn't already hold —
  //    first link (null → account) or overwrite of another account's mapping
  //    (shared-computer case). Every mapping that ever existed stays
  //    reconstructable for Admin Restore. Non-fatal: the link must not fail
  //    because the log write did.
  if ((existing?.auth_user_id ?? null) !== auth_user_id) {
    const { error: auditError } = await db("identity_audit")
      .insert({ auth_user_id, device_uuid });
    if (auditError) {
      console.error("identity_audit insert error:", auditError.message);
    }
  }

  return NextResponse.json({ ok: true, device_uuid, display_name: nameToUse, restored: false });
}

// ── Sign-in Restore ──────────────────────────────────────────────────────────
//
// The account already lives on `anchor.device_uuid`. Merge this device's
// game_scores into it (best score per puzzle wins), delete this device's old
// profile row, and hand the canonical identity back for the client to adopt.
// Row counts are small (leaderboard window is days, pruned by cleanup-scores),
// so the per-batch writes here are cheap and one-time.

interface Anchor { device_uuid: string; display_name: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function restore(db: any, oldDevice: string, anchor: Anchor) {
  const canonical = anchor.device_uuid;

  // Read both identities' scores and decide the winners off-DB.
  const { data: oldRows }   = await db("game_scores")
    .select("id, game_id, puzzle_date, score").eq("device_id", oldDevice) as { data: MergeRow[] | null };
  const { data: canonRows } = await db("game_scores")
    .select("id, game_id, puzzle_date, score").eq("device_id", canonical) as { data: MergeRow[] | null };

  const plan = planScoreMerge(oldRows ?? [], canonRows ?? []);

  // Re-point surviving old rows onto the adopted identity.
  if (plan.repoint.length) {
    await db("game_scores")
      .update({ device_id: canonical })
      .in("id", plan.repoint);
  }
  // Delete the losers so each surviving (game_id, puzzle_date) is unique.
  if (plan.deleteCanonical.length) {
    await db("game_scores").delete().in("id", plan.deleteCanonical);
  }
  if (plan.deleteOld.length) {
    await db("game_scores").delete().in("id", plan.deleteOld);
  }

  // Drop this device's now-merged profile row (unique device_uuid index).
  await db("player_profiles").delete().eq("device_uuid", oldDevice);

  return NextResponse.json({
    ok: true,
    device_uuid:  canonical,
    display_name: anchor.display_name,
    restored:     true,
  });
}
