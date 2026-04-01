import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { extractCallData } from "@/lib/extract";
import type { Mission } from "@/lib/types";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: missionId } = await params;
  const supabase = createSupabaseAdmin();

  let synced = 0;

  // 1) Sync active calls (still in progress) by polling Vapi
  const { data: activeCalls } = await supabase
    .from("scout_calls")
    .select("*, mission:missions(*)")
    .eq("mission_id", missionId)
    .in("status", ["queued", "ringing", "connected"]);

  if (activeCalls && activeCalls.length > 0) {
    for (const call of activeCalls) {
      if (!call.vapi_call_id) {
        const startedAt = call.started_at ? new Date(call.started_at) : new Date(call.created_at);
        if (Date.now() - startedAt.getTime() > 120_000) {
          await supabase
            .from("scout_calls")
            .update({ status: "failed", completed_at: new Date().toISOString() })
            .eq("id", call.id);
          synced++;
        }
        continue;
      }

      try {
        const vapiRes = await fetch(`https://api.vapi.ai/call/${call.vapi_call_id}`, {
          headers: { Authorization: `Bearer ${process.env.VAPI_API_KEY}` },
        });
        if (!vapiRes.ok) continue;

        const vapiCall = await vapiRes.json();

        if (vapiCall.status === "ended" || vapiCall.status === "failed") {
          const transcript = extractTranscript(vapiCall) || call.transcript || "";
          const extractedData = await tryExtract(transcript, call.mission as Mission);
          const finalStatus = classifyCallEnd(vapiCall.status, transcript);

          await supabase
            .from("scout_calls")
            .update({
              status: finalStatus,
              transcript: transcript || call.transcript,
              duration_seconds: vapiCall.duration || vapiCall.durationSeconds || null,
              completed_at: new Date().toISOString(),
              ...extractedFields(extractedData),
            })
            .eq("id", call.id);
          synced++;
        }
      } catch (err) {
        console.error(`Failed to sync active call ${call.id}:`, err);
      }
    }
  }

  // 2) Re-extract for ended calls that have a transcript but no recommendation
  const { data: pendingExtraction } = await supabase
    .from("scout_calls")
    .select("*, mission:missions(*)")
    .eq("mission_id", missionId)
    .eq("status", "ended")
    .is("recommendation", null);

  if (pendingExtraction && pendingExtraction.length > 0) {
    for (const call of pendingExtraction) {
      let transcript = call.transcript || "";

      // If no transcript stored, try fetching from Vapi
      if (transcript.length < 20 && call.vapi_call_id) {
        try {
          const vapiRes = await fetch(`https://api.vapi.ai/call/${call.vapi_call_id}`, {
            headers: { Authorization: `Bearer ${process.env.VAPI_API_KEY}` },
          });
          if (vapiRes.ok) {
            const vapiCall = await vapiRes.json();
            transcript = extractTranscript(vapiCall) || transcript;
            if (transcript && transcript !== call.transcript) {
              await supabase
                .from("scout_calls")
                .update({ transcript })
                .eq("id", call.id);
            }
          }
        } catch {}
      }

      if (transcript.length < 20) continue;

      const extractedData = await tryExtract(transcript, call.mission as Mission);
      if (extractedData) {
        await supabase
          .from("scout_calls")
          .update(extractedFields(extractedData))
          .eq("id", call.id);
        synced++;
      }
    }
  }

  // 3) Check if all calls are done now
  if (synced > 0) {
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

  return NextResponse.json({ synced });
}

function extractTranscript(vapiCall: Record<string, unknown>): string {
  const artifact = (vapiCall.artifact || {}) as Record<string, unknown>;
  return (
    (artifact.transcript as string) ||
    (vapiCall.transcript as string) ||
    (vapiCall.messages as Array<{ role: string; content: string }>)
      ?.map((m) => `${m.role}: ${m.content}`)
      .join("\n") ||
    ""
  );
}

function classifyCallEnd(vapiStatus: string, transcript: string): string {
  if (vapiStatus === "failed") return "failed";
  const lc = transcript.toLowerCase();
  if (lc.includes("voicemail") || lc.includes("leave a message")) return "voicemail";
  if (transcript.length < 20) return "no_answer";
  return "ended";
}

async function tryExtract(transcript: string, mission: Mission) {
  if (!transcript || transcript.length < 20) return null;
  try {
    return await extractCallData(transcript, mission);
  } catch (err) {
    console.error("Extraction attempt failed:", err);
    return null;
  }
}

function extractedFields(data: Awaited<ReturnType<typeof tryExtract>>) {
  if (!data) return {};
  return {
    wait_time: data.wait_time || null,
    vibe_report: data.vibe || null,
    menu_notes: data.menu_notes || null,
    availability: data.availability || null,
    special_notes: data.special_notes || null,
    recommendation: data.recommendation || null,
    recommendation_reason: data.recommendation_reason || null,
    call_summary: data.call_summary || null,
    highlights: data.highlights || null,
    noise_level: data.noise_level || null,
    crowd_level: data.crowd_level || null,
    outdoor_seating: data.outdoor_seating ?? null,
    bar_seating: data.bar_seating ?? null,
    vibe_tags: data.vibe_tags || null,
    price_per_person: data.price_per_person || null,
  };
}
