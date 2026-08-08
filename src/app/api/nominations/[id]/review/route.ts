// POST /api/nominations/[id]/review — admin approve or reject a nomination.
//
// Admin auth is the platform's one wire format: an `x-admin-secret` header
// matching ADMIN_SECRET, answered with 401 (see requireAdmin in lib/apiRoute).
// This route used to take the secret as an `adminSecret` body field and answer
// 403 — the same concept in a second shape, which is what the envelope removes.

import { NextRequest, NextResponse } from "next/server";

import { jsonError, jsonMessage, parseJson, requireAdmin } from "@/lib/apiRoute";
import { getServiceRoleClient, table } from "@/lib/supabase";

export const runtime = "edge";

interface ReviewPayload {
  action: "approve" | "reject";
}

export async function POST(
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

  // The anon client has INSERT-only RLS on `nominations` (there is no UPDATE
  // policy, by design — approving must not be open to the public). The admin
  // secret is already validated above, so use the service-role client, which
  // bypasses RLS, to persist the status change.
  const supabase = getServiceRoleClient();

  const newStatus = action === "approve" ? "accepted" : "rejected";
  const { error } = await table(supabase, "nominations")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) return jsonError("db_error", error.message);

  return NextResponse.json({ ok: true });
}
