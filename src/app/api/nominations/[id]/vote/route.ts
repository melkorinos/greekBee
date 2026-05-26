// POST /api/nominations/[id]/vote — cast a vote for a nomination

import { NextRequest, NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "edge";

interface VotePayload {
  deviceId: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: VotePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { deviceId } = body;
  if (!deviceId || typeof deviceId !== "string") {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("nomination_votes") as any).insert({
    nomination_id: id,
    device_id:     deviceId,
  });

  if (error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
