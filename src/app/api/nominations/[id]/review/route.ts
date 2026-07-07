// POST /api/nominations/[id]/review — admin approve or reject a nomination
// Requires adminSecret matching ADMIN_SECRET env var.

import { NextRequest, NextResponse } from "next/server";

import { getServiceRoleClient } from "@/lib/supabase";

export const runtime = "edge";

interface ReviewPayload {
  action:      "approve" | "reject";
  adminSecret: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: ReviewPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { action, adminSecret } = body;

  if (adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  // The anon client has INSERT-only RLS on `nominations` (there is no UPDATE
  // policy, by design — approving must not be open to the public). The admin
  // secret is already validated above, so use the service-role client, which
  // bypasses RLS, to persist the status change.
  const supabase = getServiceRoleClient();

  const newStatus = action === "approve" ? "accepted" : "rejected";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("nominations") as any)
    .update({ status: newStatus })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
