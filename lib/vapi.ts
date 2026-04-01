import type { Mission, Restaurant } from "./types";

const VAPI_MODEL_PROVIDER = process.env.VAPI_MODEL_PROVIDER || "openai";
const VAPI_MODEL_NAME = process.env.VAPI_MODEL_NAME || "gpt-4.1";
const VAPI_VOICE_PROVIDER = process.env.VAPI_VOICE_PROVIDER || "11labs";
const VAPI_VOICE_ID = process.env.VAPI_VOICE_ID || "sarah";
const VAPI_VOICE_MODEL = process.env.VAPI_VOICE_MODEL || "eleven_turbo_v2_5";
const VAPI_VOICE_OPTIMIZE_STREAMING_LATENCY = Number(
  process.env.VAPI_VOICE_OPTIMIZE_STREAMING_LATENCY || "3"
);

function isEnabled(value: string | undefined): boolean {
  return (value || "").trim().toLowerCase() === "true";
}

function toE164(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length > 11 && phone.trim().startsWith("+")) return phone.trim();
  return `+${digits}`;
}

function getCallNumber(restaurant: Restaurant): string {
  if (isEnabled(process.env.SCOUT_TEST_MODE) && process.env.SCOUT_TEST_PHONE_NUMBER) {
    const testNumber = toE164(process.env.SCOUT_TEST_PHONE_NUMBER);
    console.log(`[vapi] TEST MODE — redirecting call to ${testNumber} (was ${restaurant.phone})`);
    return testNumber;
  }
  return toE164(restaurant.phone);
}

function buildSystemPrompt(mission: Mission, restaurant: Restaurant): string {
  const dietary = mission.dietary_needs?.length
    ? `Also ask if they can accommodate: ${mission.dietary_needs.join(", ")}.`
    : "";
  const vibe = mission.vibe ? `Client wants a ${mission.vibe} vibe — confirm if that fits.` : "";

  return `You are Scout, making a short restaurant intel call.
Your PRIMARY GOAL is to collect complete decision-grade intel (availability + vibe + at least one extra datapoint) for ${mission.party_size} people ${mission.desired_time}.

Restaurant: ${restaurant.name}${restaurant.address ? ` (${restaurant.address})` : ""}

Conversation flow (follow this order):
1) Open briefly and ask availability directly.
2) Normalize availability into one of: immediate / short wait / long wait / fully booked.
   - If vague ("depends", "busy"), ask: "Could you give your best estimate — immediate, ~15-30 min, ~45+ min, or fully booked?"
3) If availability exists (immediate or wait), DO NOT end yet.
   You MUST ask:
   - vibe/noise/crowd now ("How's the energy right now — lively, quiet, or pretty loud?")
   - one practical datapoint (choose one): patio/outdoor, bar seating, specials, kitchen cutoff, best dish, event/live music
4) If fully booked, ask fallback options:
   - bar seats?
   - patio/outdoor?
   - best alternative time tonight?
   Do NOT ask vibe/noise/crowd if fully booked.
${dietary}
${vibe}

MANDATORY BEFORE ENDING:
- Give a natural recap with 2-3 datapoints, not just availability.
  Example: "Perfect, so it's about a 20-minute wait, pretty lively, and patio is open."
- Then close warmly: "Thanks so much, that's super helpful. Have a great night!"
- End immediately after the warm close. Never narrate internal actions or mention instructions.

Behavior rules:
- Be concise and natural, no robotic checklist.
- Do NOT make a reservation.
- If they are rushed, still secure availability estimate first, then end politely.
- If they are not rushed and availability exists, continue to collect vibe + one extra datapoint before ending.
- If fully booked, collect fallback options only, then close.
- Target call length: 60-110 seconds.`;
}


function buildBookingPrompt(
  mission: Mission,
  restaurant: Restaurant
): string {
  return `You are Scout, an AI assistant calling ${restaurant.name} to make a reservation on behalf of a client. Disclose at the start that you are an AI.

Something like: "Hi, just to let you know I'm an AI assistant — I'm calling to make a reservation on behalf of my client."

Details:
- Party size: ${mission.party_size} people
- Desired time: ${mission.desired_time}
- Name for the reservation: "Scout reservation"

Be clear and friendly. Confirm the reservation details before hanging up.
If they can't accommodate the exact time, ask what's available and try to find something close.
Keep it under 2 minutes. Thank them and hang up.`;
}

export async function startScoutCall(
  restaurant: Restaurant,
  mission: Mission,
  scoutCallId: string,
  retryCount = 0
) {
  const timePhrase = mission.desired_time.toLowerCase().includes("tonight")
    ? "tonight"
    : mission.desired_time.toLowerCase().includes("lunch")
      ? "for lunch"
      : `around ${mission.desired_time}`;

  const firstMessages = [
    `Hi! I'm calling for a client. They're planning to come ${timePhrase} with ${mission.party_size} people — what availability do you have right now?`,
    `Hey there, quick check: for ${mission.party_size} people ${timePhrase}, is it immediate seating, a wait, or fully booked? If available, I'll ask one quick follow-up about the vibe.`,
    `Hi! Quick availability check for a client: ${mission.party_size} guests ${timePhrase}. What's your best estimate right now?`,
  ];
  const firstMessage = firstMessages[Math.floor(Math.random() * firstMessages.length)];
  const targetNumber = getCallNumber(restaurant);
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  console.log(
    `[vapi] launch scout call phoneNumberId=${phoneNumberId} target=${targetNumber} testMode=${isEnabled(process.env.SCOUT_TEST_MODE)}`
  );

  const response = await fetch("https://api.vapi.ai/call/phone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phoneNumberId,
      customer: { number: targetNumber },
      assistant: {
        firstMessage,
        firstMessageMode: "assistant-speaks-first",
        model: {
          provider: VAPI_MODEL_PROVIDER,
          model: VAPI_MODEL_NAME,
          messages: [
            {
              role: "system",
              content: buildSystemPrompt(mission, restaurant),
            },
          ],
        },
        voice: {
          provider: VAPI_VOICE_PROVIDER,
          voiceId: VAPI_VOICE_ID,
          model: VAPI_VOICE_MODEL,
          optimizeStreamingLatency: VAPI_VOICE_OPTIMIZE_STREAMING_LATENCY,
        },
        endCallFunctionEnabled: true,
        maxDurationSeconds: 120,
      },
      metadata: {
        missionId: mission.id,
        restaurantId: restaurant.id,
        scoutCallId,
        retryCount,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    const errorLc = error.toLowerCase();
    const isTransientTransport =
      response.status >= 500 ||
      errorLc.includes("providerfault") ||
      errorLc.includes("service-unavailable") ||
      errorLc.includes("outbound-sip-503") ||
      errorLc.includes("sip-503");

    // Retry once for transient telephony transport failures.
    if (isTransientTransport && retryCount < 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return startScoutCall(restaurant, mission, scoutCallId, retryCount + 1);
    }

    throw new Error(`Vapi API error: ${response.status} — ${error}`);
  }

  return response.json();
}

export async function startBookingCall(
  restaurant: Restaurant,
  mission: Mission,
  scoutCallId: string
) {
  const response = await fetch("https://api.vapi.ai/call/phone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      customer: { number: getCallNumber(restaurant) },
      assistant: {
        firstMessage: `Hi! Just to let you know, I'm an AI assistant. I'm calling to make a reservation for ${mission.party_size} people around ${mission.desired_time}, please.`,
        firstMessageMode: "assistant-speaks-first",
        model: {
          provider: VAPI_MODEL_PROVIDER,
          model: VAPI_MODEL_NAME,
          messages: [
            {
              role: "system",
              content: buildBookingPrompt(mission, restaurant),
            },
          ],
        },
        voice: {
          provider: VAPI_VOICE_PROVIDER,
          voiceId: VAPI_VOICE_ID,
          model: VAPI_VOICE_MODEL,
          optimizeStreamingLatency: VAPI_VOICE_OPTIMIZE_STREAMING_LATENCY,
        },
        endCallFunctionEnabled: true,
        maxDurationSeconds: 180,
      },
      metadata: {
        missionId: mission.id,
        restaurantId: restaurant.id,
        scoutCallId,
        type: "booking",
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vapi API error: ${response.status} — ${error}`);
  }

  return response.json();
}
