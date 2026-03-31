import OpenAI from "openai";
import type { CallExtraction, Mission } from "./types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function extractCallData(
  transcript: string,
  mission: Mission
): Promise<CallExtraction> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Extract restaurant intel from this phone call transcript.
Return JSON with exactly these fields:
{
  "wait_time": "20 minutes" | "no wait" | "45 min+" | null,
  "vibe": "busy and loud" | "mellow, half empty" | "packed" | null,
  "menu_notes": "86'd the mussels, running a prix fixe special" | "full menu" | null,
  "availability": "bar seats open" | "8:15 available" | "fully booked" | null,
  "dietary_safe": true | false | null,
  "recommendation": "best_bet" | "worth_it" | "skip",
  "recommendation_reason": "one sentence explaining why",
  "special_notes": "anything else notable" | null
}`,
      },
      {
        role: "user",
        content: `Mission context: ${mission.party_size} people, ${mission.desired_time}, wants ${mission.vibe || "any"} vibe, dietary: ${mission.dietary_needs?.join(", ") || "none"}\n\nTranscript:\n${transcript}`,
      },
    ],
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No content in LLM response");

  return JSON.parse(content) as CallExtraction;
}
