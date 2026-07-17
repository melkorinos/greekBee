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
// Occupied-device guard (ADR 0012 amendment / issue 01): if the caller's device
// row is already linked to a *different* account (a shared browser left
// un-Disconnected), the route never overwrites or absorbs it. A returning caller
// adopts their own canonical identity (no merge of the resident's history); a
// first-time caller is minted a fresh device_uuid. Either way the resident's row
// is left untouched.
//
// Privileged writes go through the service-role client (bypasses RLS, which has
// no DELETE policy on player_profiles and scopes UPDATE to auth.uid()).
//
// Idempotent — safe to call on every sign-in.

import { NextRequest, NextResponse } from "next/server";
import { jsonError, jsonMessage, parseJson } from "@/lib/apiRoute";
import { getServiceRoleClient, getSupabaseClient, table, type BoundTable } from "@/lib/supabase";

/** This route's local table shorthand — see the `db` binding in POST. */
type Db = BoundTable;
import { planScoreMerge, type MergeRow } from "@/lib/scoreMerge";
import { planAchievementMerge, type AchievementMergeRow } from "@/lib/achievementMerge";
import { planPangramMerge, type PangramMergeRow } from "@/lib/pangramMerge";

export const runtime = "edge";

interface LinkPayload {
  device_uuid: string;
}

export async function POST(req: NextRequest) {
  // 1. Verify the JWT and derive the auth identity server-side.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!token) {
    return jsonError("unauthorized");
  }

  const { data: { user }, error: authError } = await getSupabaseClient().auth.getUser(token);
  if (authError || !user) {
    // Missing vs. rejected token are one answer on the wire — telling an
    // unauthenticated caller which of the two it was only helps an attacker.
    return jsonError("unauthorized", authError?.message);
  }

  const auth_user_id = user.id;
  const googleName = (user.user_metadata?.["full_name"] as string | undefined) ?? null;

  // 2. device_uuid is the only body field — the caller's own device to link.
  const parsed = await parseJson<LinkPayload>(req);
  if (!parsed.ok) return parsed.response;

  const { device_uuid } = parsed.body;
  if (!device_uuid) {
    return jsonMessage("device_uuid is required");
  }

  const supabase = getServiceRoleClient();

  // Local shorthand over the shared table() accessor — this route makes ~20 calls
  // and reads better without the client repeated each time. Generic, so binding
  // the client does not flatten each table's Row/Insert types back to a union.
  // table() calls from() as a method, so the old `this`-binding hazard
  // ("Cannot read properties of undefined (reading 'rest')") cannot return here.
  const db: Db = (name) => table(supabase, name);

  // 3. Is this auth account already anchored to a profile? The unique partial
  //    index on player_profiles.auth_user_id guarantees at most one.
  const { data: anchor } = await db("player_profiles")
    .select("device_uuid, display_name")
    .eq("auth_user_id", auth_user_id)
    .maybeSingle() as { data: { device_uuid: string; display_name: string } | null };

  // 4. Who owns the caller's current device row right now? Resolved before the
  //    restore/link decisions so we never overwrite or absorb a row linked to a
  //    *different* account — the occupied-device guard (ADR 0012 amendment,
  //    issue 01): a shared browser someone signed into and walked away from.
  const { data: existing } = await db("player_profiles")
    .select("display_name, auth_user_id")
    .eq("device_uuid", device_uuid)
    .maybeSingle() as { data: { display_name: string; auth_user_id?: string | null } | null };

  const occupied = !!existing?.auth_user_id && existing.auth_user_id !== auth_user_id;

  // 5. Occupied device: the browser still holds another account's linked identity.
  //    Never touch that row — the caller gets their own identity, the resident
  //    owner is left intact.
  if (occupied) {
    if (anchor) {
      // Returning caller — adopt their own canonical identity. Deliberately skip
      // the Sign-in Restore merge/delete: this device's history belongs to the
      // resident, not the caller.
      return NextResponse.json({
        ok:           true,
        device_uuid:  anchor.device_uuid,
        display_name: anchor.display_name,
        restored:     true,
      });
    }
    // First-time caller — mint a fresh device identity rather than overwriting
    // the resident's auth_user_id. The client adopts the returned device_uuid.
    return await linkFreshDevice(db, auth_user_id, googleName);
  }

  // 6. Sign-in Restore: the account lives on another (un-occupied) device — adopt
  //    it and merge this device's history into it (ADR 0012).
  if (anchor && anchor.device_uuid !== device_uuid) {
    return await restore(db, device_uuid, anchor);
  }

  // 7. Link this device (first sign-in / same device). Use the verified Google
  //    name only when the player has no name yet.
  const nameToUse =
    existing?.display_name?.trim()
      ? existing.display_name
      : (googleName?.trim() || "Ανώνυμος");

  // Upsert profile row — set auth_user_id + ensure display_name is populated.
  const { error: profileError } = await db("player_profiles").upsert(
    { device_uuid, auth_user_id, display_name: nameToUse },
    { onConflict: "device_uuid" }
  );

  if (profileError) {
    return jsonError("db_error", profileError.message);
  }

  // 8. Audit the mapping change (ADR 0012): append an identity_audit row only
  //    when this link established a pair the profile row didn't already hold
  //    (first link: null → account). The occupied-device overwrite that used to
  //    reach here is now prevented in step 5, so this fires only for the caller's
  //    own device. Every mapping that ever existed stays reconstructable for
  //    Admin Restore. Non-fatal: the link must not fail because the log did.
  if ((existing?.auth_user_id ?? null) !== auth_user_id) {
    const { error: auditError } = await db("identity_audit")
      .insert({ auth_user_id, device_uuid });
    if (auditError) {
      console.error("identity_audit insert error:", auditError.message);
    }
  }

  return NextResponse.json({ ok: true, device_uuid, display_name: nameToUse, restored: false });
}

// ── Fresh-device link (occupied-device guard, ADR 0012 amendment) ──────────────
//
// The caller's current browser still holds another account's linked identity and
// the caller has no anchor of their own. Rather than overwrite the resident's
// row, mint the caller a brand-new device identity; the client adopts the
// returned device_uuid (auth/callback → adoptDeviceIdentity), so no anonymous
// history of the resident's is absorbed. restored:false — nothing came back.

async function linkFreshDevice(db: Db, auth_user_id: string, googleName: string | null) {
  const device_uuid  = crypto.randomUUID();
  const display_name = googleName?.trim() || "Ανώνυμος";

  const { error: profileError } = await db("player_profiles").upsert(
    { device_uuid, auth_user_id, display_name },
    { onConflict: "device_uuid" }
  );
  if (profileError) {
    return jsonError("db_error", profileError.message);
  }

  const { error: auditError } = await db("identity_audit")
    .insert({ auth_user_id, device_uuid });
  if (auditError) {
    console.error("identity_audit insert error:", auditError.message);
  }

  return NextResponse.json({ ok: true, device_uuid, display_name, restored: false });
}

// ── Sign-in Restore ──────────────────────────────────────────────────────────
//
// The account already lives on `anchor.device_uuid`. Merge this device's
// game_scores into it (best score per puzzle wins), delete this device's old
// profile row, and hand the canonical identity back for the client to adopt.
// Row counts are small (leaderboard window is days, pruned by cleanup-scores),
// so the per-batch writes here are cheap and one-time.

interface Anchor { device_uuid: string; display_name: string }

async function restore(db: Db, oldDevice: string, anchor: Anchor) {
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

  // Merge earned achievements too (ADR 0013): union onto the canonical identity.
  // Without this, restoring an account would drop the old device's badges. The
  // set has no "better" — carry over what canonical lacks, drop duplicates the
  // UNIQUE(device_uuid, achievement_id) constraint would otherwise reject.
  const { data: oldAch }   = await db("player_achievements")
    .select("id, achievement_id").eq("device_uuid", oldDevice) as { data: AchievementMergeRow[] | null };
  const { data: canonAch } = await db("player_achievements")
    .select("id, achievement_id").eq("device_uuid", canonical) as { data: AchievementMergeRow[] | null };

  const achPlan = planAchievementMerge(oldAch ?? [], canonAch ?? []);
  if (achPlan.repoint.length) {
    await db("player_achievements")
      .update({ device_uuid: canonical })
      .in("id", achPlan.repoint);
  }
  if (achPlan.deleteOld.length) {
    await db("player_achievements").delete().in("id", achPlan.deleteOld);
  }

  // Merge the pangram find-set too (ADR 0013 lane C, B2): union onto the canonical
  // identity. Same shape as the achievement merge, but the dedup key is the
  // composite (puzzle_date, word) — the same word on a different day is a distinct
  // find. Carry over what canonical lacks; drop duplicates the
  // UNIQUE(device_uuid, puzzle_date, word) constraint would otherwise reject.
  const { data: oldPan }   = await db("player_pangrams")
    .select("id, puzzle_date, word").eq("device_uuid", oldDevice) as { data: PangramMergeRow[] | null };
  const { data: canonPan } = await db("player_pangrams")
    .select("id, puzzle_date, word").eq("device_uuid", canonical) as { data: PangramMergeRow[] | null };

  const panPlan = planPangramMerge(oldPan ?? [], canonPan ?? []);
  if (panPlan.repoint.length) {
    await db("player_pangrams")
      .update({ device_uuid: canonical })
      .in("id", panPlan.repoint);
  }
  if (panPlan.deleteOld.length) {
    await db("player_pangrams").delete().in("id", panPlan.deleteOld);
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
