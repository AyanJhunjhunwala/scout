import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { extractCallData } from "@/lib/extract";
import type { Mission } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Vapi can send events wrapped in `message` or at the top level
  const message = body.message || body;
  const eventType = message.type;

  if (!eventType) {
    return NextResponse.json({ received: true });
  }

  const supabase = createSupabaseAdmin();

  // Extract call info — Vapi nests it differently per event type
  const call = message.call || {};
  const callId = call.id || message.callId || message.call_id;
  const metadata = call.metadata || message.metadata || {};
  const scoutCallId = metadata.scoutCallId;

  console.log(`[vapi-webhook] event=${eventType} callId=${callId} scoutCallId=${scoutCallId}`);

  if (!scoutCallId) {
    // Try to find scout call by vapi_call_id as fallback
    if (callId) {
      const { data } = await supabase
        .from("scout_calls")
        .select("id, mission_id")
        .eq("vapi_call_id", callId)
        .single();

      if (data) {
        return handleEvent(supabase, eventType, message, data.id, data.mission_id, callId);
      }
    }
    return NextResponse.json({ received: true });
  }

  const missionId = metadata.missionId;
  return handleEvent(supabase, eventType, message, scoutCallId, missionId, callId);
}

async function handleEvent(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  eventType: string,
  message: Record<string, unknown>,
  scoutCallId: string,
  missionId: string,
  vapiCallId: string
) {
  try {
    switch (eventType) {
      case "call.ringing":
      case "call.started":
      case "status-update": {
        const status =
          (message.status as string) ||
          (eventType === "call.started" ? "in-progress" : "ringing");

        const dbStatus =
          status === "in-progress" || status === "active" ? "connected" : "ringing";

        await supabase
          .from("scout_calls")
          .update({
            status: dbStatus,
            vapi_call_id: vapiCallId,
          })
          .eq("id", scoutCallId);
        break;
      }

      case "transcript": {
        const transcript =
          (message.transcript as string) ||
          ((message.artifact as Record<string, unknown>)?.transcript as string) ||
          "";
        if (transcript) {
          await supabase
            .from("scout_calls")
            .update({ transcript })
            .eq("id", scoutCallId);
        }
        break;
      }

      case "conversation-update": {
        const conversation = message.conversation as Array<{ role: string; content: string }> | undefined;
        if (conversation && conversation.length > 0) {
          const fullTranscript = conversation
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n");
          await supabase
            .from("scout_calls")
            .update({ transcript: fullTranscript, status: "connected" })
            .eq("id", scoutCallId);
        }
        break;
      }

      case "end-of-call-report":
      case "call.completed":
      case "call.ended":
      case "hangup": {
        const artifact = (message.artifact || {}) as Record<string, unknown>;
        const callObj = (message.call || {}) as Record<string, unknown>;
        const transcript =
          (artifact.transcript as string) ||
          (message.transcript as string) ||
          (message.summary as string) ||
          "";
        const durationSeconds =
          (message.durationSeconds as number) ||
          (message.duration as number) ||
          (artifact.duration as number) ||
          null;
        const endedReason =
          (callObj.endedReason as string) ||
          (message.endedReason as string) ||
          (message.ended_reason as string) ||
          "";
        const endedMessage =
          (callObj.endedMessage as string) ||
          (message.endedMessage as string) ||
          (message.ended_message as string) ||
          "";

        const { data: scoutCall } = await supabase
          .from("scout_calls")
          .select("*, mission:missions(*)")
          .eq("id", scoutCallId)
          .single();

        if (!scoutCall) break;

        // durationSeconds > 5 means someone answered (even if they hung up quickly)
        const wasAnswered = typeof durationSeconds === "number" && durationSeconds > 5;

        const lcTranscript = transcript.toLowerCase();
        const isVoicemail =
          lcTranscript.includes("voicemail") ||
          lcTranscript.includes("leave a message") ||
          lcTranscript.includes("not available");

        const reasonLc = `${endedReason} ${endedMessage}`.toLowerCase();
        const isTransportFailure =
          reasonLc.includes("error-get-transport") ||
          reasonLc.includes("providerfault") ||
          reasonLc.includes("service-unavailable") ||
          reasonLc.includes("sip-503") ||
          reasonLc.includes("sip 503") ||
          reasonLc.includes("outbound-sip") ||
          reasonLc.includes("unverified") ||
          reasonLc.includes("trial accounts") ||
          reasonLc.includes("forbidden") ||
          reasonLc.includes("blocked") ||
          reasonLc.includes("invalid");
        const isBusySignal =
          reasonLc.includes("busy") ||
          reasonLc.includes("declined") ||
          reasonLc.includes("rejected");

        const finalStatus = isTransportFailure || isBusySignal
          ? "failed"
          : isVoicemail
            ? "voicemail"
            : wasAnswered
              ? "ended" // answered — even a cut call counts as ended
              : transcript.length < 20
                ? "no_answer"
                : "ended";

        // Try extraction whenever there's any transcript content
        let extractedData = null;
        if (transcript && transcript.trim().length > 0) {
          try {
            extractedData = await extractCallData(
              transcript,
              scoutCall.mission as Mission
            );
          } catch (err) {
            console.error("Extraction failed:", err);
          }
        }

        // If call was answered but cut short, note it in the summary
        const wasCutShort = wasAnswered && transcript.length < 60;
        const callSummary =
          extractedData?.call_summary ||
          (transcript && transcript.length > 20
            ? transcript.slice(0, 220)
            : wasCutShort
              ? "Call ended before Scout could gather full information."
              : "Call ended.");

        const fallbackRecommendation =
          finalStatus === "ended" ? "worth_it" : null;
        const fallbackReason =
          finalStatus === "ended"
            ? "Call ended; summary extracted with limited detail."
            : null;

        const { error: updateError } = await supabase
          .from("scout_calls")
          .update({
            status: finalStatus,
            transcript: transcript || scoutCall.transcript,
            duration_seconds: durationSeconds,
            completed_at: new Date().toISOString(),
            special_notes: endedMessage || endedReason || extractedData?.special_notes || null,
            wait_time: extractedData?.wait_time || null,
            vibe_report: extractedData?.vibe || null,
            menu_notes: extractedData?.menu_notes || null,
            availability: extractedData?.availability || null,
            recommendation: extractedData?.recommendation || fallbackRecommendation,
            recommendation_reason: extractedData?.recommendation_reason || fallbackReason,
            call_summary: callSummary,
            highlights: extractedData?.highlights || null,
          })
          .eq("id", scoutCallId);
        if (updateError) {
          console.error("Webhook end-call update failed:", updateError);
        }

        // Check if all calls in mission are done
        if (missionId) {
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
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
  }

  return NextResponse.json({ received: true });
}
