import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { startScoutCall } from "@/lib/vapi";
import type { LaunchMissionInput, Mission, Restaurant } from "@/lib/types";

const MAX_CONCURRENT_CALLS = 3;
const TEST_MODE = (process.env.SCOUT_TEST_MODE || "").trim().toLowerCase() === "true";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: missionId } = await params;
  const body: LaunchMissionInput = await req.json();
  const { restaurant_ids } = body;

  if (!restaurant_ids || restaurant_ids.length === 0) {
    return NextResponse.json(
      { error: "restaurant_ids array is required" },
      { status: 400 }
    );
  }

  if (restaurant_ids.length > 5) {
    return NextResponse.json(
      { error: "Maximum 5 restaurants per mission" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdmin();

  const { data: mission, error: missionError } = await supabase
    .from("missions")
    .select("*")
    .eq("id", missionId)
    .single();

  if (missionError || !mission) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }

  const { data: restaurants, error: restError } = await supabase
    .from("restaurants")
    .select("*")
    .in("id", restaurant_ids);

  if (restError || !restaurants?.length) {
    return NextResponse.json(
      { error: "Restaurants not found" },
      { status: 404 }
    );
  }

  try {
    // In test mode every call targets the same phone number.
    // Launching multiple parallel calls to one number is unreliable (carrier/device will suppress).
    const restaurantsToCall = TEST_MODE ? restaurants.slice(0, 1) : restaurants;

    const callRows = await Promise.all(
      restaurantsToCall.map(async (restaurant: Restaurant) => {
        const { data: callRow, error } = await supabase
          .from("scout_calls")
          .insert({
            mission_id: missionId,
            restaurant_id: restaurant.id,
            status: "queued",
          })
          .select()
          .single();

        if (error) throw error;
        return { callRow, restaurant };
      })
    );

    await supabase
      .from("missions")
      .update({ status: "calling" })
      .eq("id", missionId);

    // Fire calls in batches to respect rate limits
    const batches = [];
    for (let i = 0; i < callRows.length; i += MAX_CONCURRENT_CALLS) {
      batches.push(callRows.slice(i, i + MAX_CONCURRENT_CALLS));
    }

    const launchErrors: string[] = [];

    for (const batch of batches) {
      await Promise.all(
        batch.map(async ({ callRow, restaurant }) => {
          try {
            const vapiResponse = await startScoutCall(
              restaurant,
              mission as Mission,
              callRow.id
            );

            const listenUrl = vapiResponse.monitor?.listenUrl || null;

            await supabase
              .from("scout_calls")
              .update({
                vapi_call_id: vapiResponse.id,
                status: "ringing",
                started_at: new Date().toISOString(),
                listen_url: listenUrl,
              })
              .eq("id", callRow.id);
          } catch (err) {
            console.error(`Call failed for ${restaurant.name}:`, err);
            const errorText =
              err instanceof Error ? err.message : "Failed to start call";
            launchErrors.push(errorText);
            await supabase
              .from("scout_calls")
              .update({ status: "failed", special_notes: errorText })
              .eq("id", callRow.id);
          }
        })
      );
    }

    if (launchErrors.length === callRows.length) {
      const providerLimitError = launchErrors.find((e) =>
        e.toLowerCase().includes("daily outbound call limit")
      );
      if (providerLimitError) {
        return NextResponse.json(
          {
            error:
              "Call provider limit reached for your Vapi phone number. Import your own Twilio number in Vapi (or wait for daily reset) to place more outbound calls.",
            details: providerLimitError,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: "All calls failed to start.",
          details: launchErrors[0],
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      missionId,
      testMode: TEST_MODE,
      attemptedCalls: callRows.length,
      note: TEST_MODE
        ? "Test mode active: only the first selected restaurant is dialed to avoid parallel calls to the same test number."
        : undefined,
    });
  } catch (err) {
    console.error("Launch mission failed:", err);
    return NextResponse.json(
      { error: "Failed to launch calls" },
      { status: 500 }
    );
  }
}
