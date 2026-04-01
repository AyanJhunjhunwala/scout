import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { startScoutCall } from "@/lib/vapi";
import type { Mission, Restaurant } from "@/lib/types";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scoutCallId } = await params;
  const supabase = createSupabaseAdmin();

  const { data: scoutCall, error } = await supabase
    .from("scout_calls")
    .select("*, restaurant:restaurants(*), mission:missions(*)")
    .eq("id", scoutCallId)
    .single();

  if (error || !scoutCall) {
    return NextResponse.json({ error: "Scout call not found" }, { status: 404 });
  }

  if (!["no_answer", "voicemail", "failed"].includes(scoutCall.status)) {
    return NextResponse.json({ error: "Can only retry a declined or failed call" }, { status: 400 });
  }

  try {
    const vapiResponse = await startScoutCall(
      scoutCall.restaurant as Restaurant,
      scoutCall.mission as Mission,
      scoutCallId
    );

    // Reset the scout_call to ringing with fresh state
    await supabase
      .from("scout_calls")
      .update({
        status: "ringing",
        vapi_call_id: vapiResponse.id,
        started_at: new Date().toISOString(),
        transcript: null,
        recommendation: null,
        recommendation_reason: null,
        call_summary: null,
        wait_time: null,
        vibe_report: null,
        availability: null,
        special_notes: null,
        highlights: null,
        noise_level: null,
        crowd_level: null,
        outdoor_seating: null,
        bar_seating: null,
        vibe_tags: null,
        price_per_person: null,
        completed_at: null,
        duration_seconds: null,
      })
      .eq("id", scoutCallId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Retry call failed:", err);
    return NextResponse.json({ error: "Failed to retry call" }, { status: 500 });
  }
}
