import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseAdmin();

  // Delete child rows first (no cascade in schema)
  const { error: callsError } = await supabase
    .from("scout_calls")
    .delete()
    .eq("mission_id", id);

  if (callsError) {
    return NextResponse.json({ error: "Failed to delete calls" }, { status: 500 });
  }

  const { error } = await supabase.from("missions").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete mission" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseAdmin();

  const { data: mission, error: missionError } = await supabase
    .from("missions")
    .select("*")
    .eq("id", id)
    .single();

  if (missionError || !mission) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }

  const { data: calls, error: callsError } = await supabase
    .from("scout_calls")
    .select("*, restaurant:restaurants(*)")
    .eq("mission_id", id)
    .order("created_at", { ascending: true });

  if (callsError) {
    return NextResponse.json(
      { error: "Failed to fetch calls" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ...mission,
    scout_calls: calls || [],
  });
}
