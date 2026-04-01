import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CallExtraction, Mission } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export async function extractCallData(
  transcript: string,
  mission: Mission
): Promise<CallExtraction> {
  try {
    const extracted = await extractWithGemini(transcript, mission);
    return applyTranscriptGuards(extracted, transcript);
  } catch (err) {
    console.error("Gemini extraction failed, using fallback:", err);
    const extracted = extractFallback(transcript);
    return applyTranscriptGuards(extracted, transcript);
  }
}

async function extractWithGemini(
  transcript: string,
  mission: Mission
): Promise<CallExtraction> {
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
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
  "highlights": ["short phrase the caller mentioned", "another notable detail"],
  "noise_level": "quiet" | "moderate" | "loud" | null,
  "crowd_level": "empty" | "moderate" | "busy" | "packed" | null,
  "outdoor_seating": true | false | null,
  "bar_seating": true | false | null,
  "vibe_tags": ["date-friendly" | "great for groups" | "dog-friendly" | "live music" | "late night" | "good for kids" | "quick bite" | "special occasion" | "sports bar" | "cozy" | "trendy" | "no reservations"],
  "price_per_person": "~$15-25" | "~$30-50" | "~$60+" | null
}

IMPORTANT: You MUST always return a recommendation. If unsure, use "worth_it" as default.
IMPORTANT: Always include call_summary and at least 2 highlights. Highlights should be specific things mentioned in the call (e.g. "happy hour until 7", "patio is dog-friendly", "jazz band playing tonight").
IMPORTANT: Only use what is explicitly said in transcript. If not clearly stated, return null.
IMPORTANT: For noise_level and crowd_level, do NOT infer from wait time or vague clues.
IMPORTANT: Be strict with availability booleans:
- If transcript says "no bar", "bar is full", "no bar seats", "bar not available" => "bar_seating": false
- If transcript says "no patio", "patio closed", "no outdoor", "outdoor not available" => "outdoor_seating": false
- If transcript says "nothing available", "everything booked", "fully booked", "no availability" => set "availability" to "fully booked" and do NOT set bar/outdoor to true unless explicitly available.
- Never infer true from just the words "bar" or "patio" if the phrase is negative.

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

export function extractFallback(transcript: string): CallExtraction {
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
  if (
    lc.includes("fully booked") ||
    lc.includes("no tables") ||
    lc.includes("no availability") ||
    lc.includes("nothing available") ||
    lc.includes("everything booked") ||
    lc.includes("all booked") ||
    lc.includes("sold out")
  ) {
    availability = "fully booked";
  } else if (lc.includes("available") || lc.includes("open") || lc.includes("table")) {
    availability = "tables available";
  }

  let noise_level: CallExtraction["noise_level"] = null;
  if (lc.includes("loud") || lc.includes("noisy") || lc.includes("can't hear")) noise_level = "loud";
  else if (lc.includes("quiet") || lc.includes("calm") || lc.includes("peaceful")) noise_level = "quiet";
  else if (vibe === "busy" || vibe === "lively") noise_level = "moderate";

  let crowd_level: CallExtraction["crowd_level"] = null;
  if (lc.includes("packed") || lc.includes("crowded")) crowd_level = "packed";
  else if (lc.includes("busy") || lc.includes("full")) crowd_level = "busy";
  else if (lc.includes("empty") || lc.includes("slow night")) crowd_level = "empty";
  else if (lc.includes("moderate") || lc.includes("half")) crowd_level = "moderate";

  const hasNegativeOutdoor =
    /\b(no|not|none|without)\s+(outdoor|patio|terrace)\b/.test(lc) ||
    /\b(outdoor|patio|terrace)\s+(closed|full|unavailable|not available)\b/.test(lc) ||
    lc.includes("indoor only");
  const hasPositiveOutdoor =
    /\b(outdoor|patio|terrace)\s+(available|open)\b/.test(lc) ||
    /\bwe have (a )?(patio|outdoor|terrace)\b/.test(lc);

  const outdoor_seating =
    hasNegativeOutdoor ? false
    : hasPositiveOutdoor ? true
    : null;

  const hasNegativeBar =
    /\b(no|not|none|without)\s+bar\b/.test(lc) ||
    /\bno bar seats?\b/.test(lc) ||
    /\bbar\s+(full|closed|unavailable|not available)\b/.test(lc);
  const hasPositiveBar =
    /\bbar\s+(seats?|top)\s+(available|open)\b/.test(lc) ||
    /\b(bar seats?|bar top)\s+open\b/.test(lc) ||
    /\bwe have bar seating\b/.test(lc);

  const bar_seating =
    hasNegativeBar ? false
    : hasPositiveBar ? true
    : null;

  const vibe_tags: string[] = [];
  if (lc.includes("date") || lc.includes("romantic")) vibe_tags.push("date-friendly");
  if (lc.includes("group") || lc.includes("party")) vibe_tags.push("great for groups");
  if (lc.includes("dog") || lc.includes("pet")) vibe_tags.push("dog-friendly");
  if (lc.includes("live music") || lc.includes("band") || lc.includes("jazz")) vibe_tags.push("live music");
  if (lc.includes("late night") || lc.includes("open late")) vibe_tags.push("late night");

  const hasUsefulInfo = wait_time || vibe || availability;

  const highlights: string[] = [];
  if (wait_time) highlights.push(`Wait: ${wait_time}`);
  if (vibe) highlights.push(`Vibe: ${vibe}`);
  if (availability) highlights.push(availability);
  if (outdoor_seating === true) highlights.push("Patio available");
  if (outdoor_seating === false) highlights.push("No patio/outdoor seating");
  if (bar_seating === true) highlights.push("Bar seating open");
  if (bar_seating === false) highlights.push("No bar seating");

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
    noise_level,
    crowd_level,
    outdoor_seating,
    bar_seating,
    vibe_tags: vibe_tags.length > 0 ? vibe_tags : null,
    price_per_person: null,
  };
}

function applyTranscriptGuards(data: CallExtraction, transcript: string): CallExtraction {
  const lc = transcript.toLowerCase();

  const explicitNegativeOutdoor =
    /\b(no|not|none|without)\s+(outdoor|patio|terrace)\b/.test(lc) ||
    /\b(outdoor|patio|terrace)\s+(closed|full|unavailable|not available)\b/.test(lc) ||
    lc.includes("indoor only");
  const explicitPositiveOutdoor =
    /\b(outdoor|patio|terrace)\s+(available|open)\b/.test(lc) ||
    /\bwe have (a )?(patio|outdoor|terrace)\b/.test(lc);

  const explicitNegativeBar =
    /\b(no|not|none|without)\s+bar\b/.test(lc) ||
    /\bno bar seats?\b/.test(lc) ||
    /\bbar\s+(full|closed|unavailable|not available)\b/.test(lc);
  const explicitPositiveBar =
    /\bbar\s+(seats?|top)\s+(available|open)\b/.test(lc) ||
    /\b(bar seats?|bar top)\s+open\b/.test(lc) ||
    /\bwe have bar seating\b/.test(lc);

  const hasBookedNegative =
    lc.includes("fully booked") ||
    lc.includes("no tables") ||
    lc.includes("no availability") ||
    lc.includes("nothing available") ||
    lc.includes("everything booked") ||
    lc.includes("all booked") ||
    lc.includes("sold out");
  const hasBookedPositive =
    /\b(table|tables|seats?)\s+(available|open)\b/.test(lc) ||
    /\bwe (do|have)\s+have\s+(availability|tables?)\b/.test(lc);

  const hasExplicitNoise =
    lc.includes("loud") || lc.includes("noisy") || lc.includes("quiet") || lc.includes("calm");
  const hasExplicitCrowd =
    lc.includes("packed") || lc.includes("crowded") || lc.includes("busy") || lc.includes("empty");

  return {
    ...data,
    outdoor_seating: explicitNegativeOutdoor
      ? false
      : explicitPositiveOutdoor
        ? true
        : null,
    bar_seating: explicitNegativeBar
      ? false
      : explicitPositiveBar
        ? true
        : null,
    availability: hasBookedNegative
      ? "fully booked"
      : hasBookedPositive
        ? data.availability
        : null,
    noise_level: hasExplicitNoise ? data.noise_level : null,
    crowd_level: hasExplicitCrowd ? data.crowd_level : null,
  };
}
