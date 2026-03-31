import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CallExtraction, Mission } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function extractCallData(
  transcript: string,
  mission: Mission
): Promise<CallExtraction> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `Extract restaurant intel from this phone call transcript.

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
}

Mission context: ${mission.party_size} people, ${mission.desired_time}, wants ${mission.vibe || "any"} vibe, dietary: ${mission.dietary_needs?.join(", ") || "none"}

Transcript:
${transcript}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  if (!text) throw new Error("No content in Gemini response");

  return JSON.parse(text) as CallExtraction;
}
