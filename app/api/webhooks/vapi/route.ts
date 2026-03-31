import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { extractCallData } from "@/lib/extract";
import type { Mission } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message } = body;

  if (!message) {
    return NextResponse.json({ error: "No message" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const eventType = message.type;
  const callId = message.call?.id;
  const metadata = message.call?.metadata;

  if (!callId || !metadata?.scoutCallId) {
    return NextResponse.json({ received: true });
  }

  const scoutCallId = metadata.scoutCallId;

  try {
    switch (eventType) {
      case "call.ringing":
      case "status-update": {
        const status = message.status || "ringing";
        if (status === "ringing" || status === "in-progress") {
          await supabase
            .from("scout_calls")
            .update({
              status: status === "in-progress" ? "connected" : "ringing",
              vapi_call_id: callId,
            })
            .eq("id", scoutCallId);
        }
        break;
      }

      case "transcript": {
        if (message.transcript) {
          await supabase
            .from("scout_calls")
            .update({ transcript: message.transcript })
            .eq("id", scoutCallId);
        }
        break;
      }

      case "end-of-call-report": {
        const transcript =
          message.artifact?.transcript || message.transcript || "";
        const durationSeconds = message.durationSeconds || message.duration || null;

        const { data: scoutCall } = await supabase
          .from("scout_calls")
          .select("*, mission:missions(*)")
          .eq("id", scoutCallId)
          .single();

        if (!scoutCall) break;

        let extractedData = null;
        if (transcript && transcript.length > 20) {
          try {
            extractedData = await extractCallData(
              transcript,
              scoutCall.mission as Mission
            );
          } catch (err) {
            console.error("Extraction failed:", err);
          }
        }

        const isVoicemail =
          transcript.toLowerCase().includes("voicemail") ||
          transcript.toLowerCase().includes("leave a message");

        const finalStatus = isVoicemail
          ? "voicemail"
          : transcript.length < 20
            ? "no_answer"
            : "ended";

        await supabase
          .from("scout_calls")
          .update({
            status: finalStatus,
            transcript,
            duration_seconds: durationSeconds,
            completed_at: new Date().toISOString(),
            wait_time: extractedData?.wait_time || null,
            vibe_report: extractedData?.vibe || null,
            menu_notes: extractedData?.menu_notes || null,
            availability: extractedData?.availability || null,
            special_notes: extractedData?.special_notes || null,
            recommendation: extractedData?.recommendation || null,
            recommendation_reason:
              extractedData?.recommendation_reason || null,
          })
          .eq("id", scoutCallId);

        // Check if all calls in mission are done
        const missionId = metadata.missionId;
        const { data: allCalls } = await supabase
          .from("scout_calls")
          .select("status")
          .eq("mission_id", missionId);

        const allDone = allCalls?.every((c) =>
          ["ended", "no_answer", "voicemail", "failed"].includes(c.status)
        );

        if (allDone) {
          await supabase
            .from("missions")
            .update({ status: "complete" })
            .eq("id", missionId);
        }

        break;
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
  }

  return NextResponse.json({ received: true });
}
