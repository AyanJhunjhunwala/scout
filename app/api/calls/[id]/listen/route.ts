import { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseAdmin();

  const { data: call } = await supabase
    .from("scout_calls")
    .select("listen_url, status")
    .eq("id", id)
    .single();

  if (!call?.listen_url) {
    return new Response(JSON.stringify({ error: "No listen URL available" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isActive = ["queued", "ringing", "connected"].includes(call.status);
  if (!isActive) {
    return new Response(JSON.stringify({ error: "Call is no longer active" }), {
      status: 410,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ listenUrl: call.listen_url }), {
    headers: { "Content-Type": "application/json" },
  });
}
