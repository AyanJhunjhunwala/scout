import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CallExtraction, Mission } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function extractCallData(
  transcript: string,
  mission: Mission
): Promise<CallExtraction> {
  try {
    return await extractWithGemini(transcript, mission);
  } catch (err) {
    console.error("Gemini extraction failed, using fallback:", err);
    return extractFallback(transcript);
  }
}

async function extractWithGemini(
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
  "special_notes": "anything else notable" | null,
  "call_summary": "2-3 sentence natural summary of the call — what was said, key info learned, and overall impression",
  "highlights": ["short phrase the caller mentioned", "another notable detail"] // 2-5 short highlights from the call
}

IMPORTANT: You MUST always return a recommendation. If unsure, use "worth_it" as default.
IMPORTANT: Always include call_summary and at least 2 highlights. Highlights should be specific things mentioned in the call (e.g. "happy hour until 7", "patio is dog-friendly", "jazz band playing tonight").

Mission context: ${mission.party_size} people, ${mission.desired_time}, wants ${mission.vibe || "any"} vibe, dietary: ${mission.dietary_needs?.join(", ") || "none"}

Transcript:
${transcript}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  if (!text) throw new Error("No content in Gemini response");

  const parsed = JSON.parse(text) as CallExtraction;

  // Ensure recommendation is always set
  if (!parsed.recommendation) {
    parsed.recommendation = "worth_it";
    parsed.recommendation_reason = parsed.recommendation_reason || "Call completed but couldn't determine a strong verdict.";
  }

  return parsed;
}

function extractFallback(transcript: string): CallExtraction {
  const lc = transcript.toLowerCase();

  let wait_time: string | null = null;
  const waitMatch = transcript.match(/(\d+)\s*(?:minute|min)/i);
  if (waitMatch) wait_time = `${waitMatch[1]} minutes`;
  else if (lc.includes("no wait")) wait_time = "no wait";
  else if (lc.includes("wait")) wait_time = "some wait";

  let vibe: string | null = null;
  if (lc.includes("busy") || lc.includes("packed") || lc.includes("crowded")) vibe = "busy";
  else if (lc.includes("quiet") || lc.includes("calm") || lc.includes("empty")) vibe = "quiet";
  else if (lc.includes("lively") || lc.includes("fun")) vibe = "lively";

  let availability: string | null = null;
  if (lc.includes("fully booked") || lc.includes("no tables") || lc.includes("no availability")) {
    availability = "fully booked";
  } else if (lc.includes("available") || lc.includes("open") || lc.includes("table")) {
    availability = "tables available";
  }

  const hasUsefulInfo = wait_time || vibe || availability;

  const highlights: string[] = [];
  if (wait_time) highlights.push(`Wait: ${wait_time}`);
  if (vibe) highlights.push(`Vibe: ${vibe}`);
  if (availability) highlights.push(availability);

  return {
    wait_time,
    vibe,
    menu_notes: null,
    availability,
    dietary_safe: null,
    recommendation: "worth_it",
    recommendation_reason: hasUsefulInfo
      ? "Call completed — basic info extracted."
      : "Call completed but limited info gathered.",
    special_notes: null,
    call_summary: hasUsefulInfo
      ? `The restaurant was reached. ${[wait_time && `Wait time is ${wait_time}.`, vibe && `The vibe is ${vibe}.`, availability && `Availability: ${availability}.`].filter(Boolean).join(" ")}`
      : "The restaurant was reached but limited information could be gathered from the call.",
    highlights: highlights.length > 0 ? highlights : ["Call completed"],
  };
}
