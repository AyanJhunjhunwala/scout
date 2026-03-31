import type { Mission, Restaurant } from "./types";

function buildSystemPrompt(mission: Mission): string {
  const dietarySection =
    mission.dietary_needs && mission.dietary_needs.length > 0
      ? `The customer has dietary restrictions: ${mission.dietary_needs.join(", ")}. Please ask if the kitchen can safely accommodate these.`
      : "";

  return `You are Scout, a friendly and natural-sounding assistant calling a restaurant on behalf of a customer. You are NOT robotic. You sound like a real person calling to ask about tonight.

Your goal: have a casual 45-60 second conversation with the host/hostess to learn the following, IN A NATURAL WAY (don't read a checklist):

1. Current wait time or availability for ${mission.party_size} people around ${mission.desired_time}
2. What the vibe/energy is like tonight (busy? mellow? loud?)
3. Any menu items that are unavailable tonight (86'd)
4. Any other relevant info (specials, events, kitchen closing early, etc.)

${dietarySection}

If they say they're closed or fully booked, thank them politely and hang up.
Do NOT try to make a reservation on this call — just gather info.
Keep it under 90 seconds. Be warm, say thanks, hang up.`;
}

function buildBookingPrompt(
  mission: Mission,
  restaurant: Restaurant
): string {
  return `You are Scout, a friendly assistant calling ${restaurant.name} to make a reservation on behalf of a customer.

Details:
- Party size: ${mission.party_size} people
- Desired time: ${mission.desired_time}
- Name for the reservation: "Scout reservation"

Be natural and friendly. Confirm the reservation details before hanging up.
If they can't accommodate the exact time, ask what's available and try to find something close.
Keep it under 2 minutes. Thank them and hang up.`;
}

export async function startScoutCall(
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
      customer: { number: restaurant.phone },
      assistant: {
        firstMessage: `Hi! I'm calling for a friend who's thinking of coming in tonight with ${mission.party_size} people around ${mission.desired_time}. Do you have any availability?`,
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: buildSystemPrompt(mission),
            },
          ],
        },
        voice: {
          provider: "11labs",
          voiceId: "sarah",
        },
        endCallFunctionEnabled: true,
        maxDurationSeconds: 120,
      },
      metadata: {
        missionId: mission.id,
        restaurantId: restaurant.id,
        scoutCallId,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
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
      customer: { number: restaurant.phone },
      assistant: {
        firstMessage: `Hi! I'd like to make a reservation for ${mission.party_size} people tonight around ${mission.desired_time}, please.`,
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: buildBookingPrompt(mission, restaurant),
            },
          ],
        },
        voice: {
          provider: "11labs",
          voiceId: "sarah",
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
