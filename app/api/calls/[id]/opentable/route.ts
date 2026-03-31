import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { buildOpenTableSearchUrl } from "@/lib/opentable";
import type { Mission, Restaurant } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseAdmin();

  const { data: call } = await supabase
    .from("scout_calls")
    .select("*, restaurant:restaurants(*), mission:missions(*)")
    .eq("id", id)
    .single();

  if (!call) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  const url = buildOpenTableSearchUrl(
    call.restaurant as Restaurant,
    call.mission as Mission
  );

  return NextResponse.json({ url });
}
