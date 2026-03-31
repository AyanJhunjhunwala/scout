import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { startBookingCall } from "@/lib/vapi";
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
    return NextResponse.json(
      { error: "Scout call not found" },
      { status: 404 }
    );
  }

  if (scoutCall.status !== "ended") {
    return NextResponse.json(
      { error: "Can only book from a completed scout call" },
      { status: 400 }
    );
  }

  try {
    const vapiResponse = await startBookingCall(
      scoutCall.restaurant as Restaurant,
      scoutCall.mission as Mission,
      scoutCallId
    );

    return NextResponse.json({
      success: true,
      bookingCallId: vapiResponse.id,
    });
  } catch (err) {
    console.error("Booking call failed:", err);
    return NextResponse.json(
      { error: "Failed to start booking call" },
      { status: 500 }
    );
  }
}
