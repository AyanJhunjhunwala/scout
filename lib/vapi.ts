import type { Mission, Restaurant } from "./types";

function buildSystemPrompt(mission: Mission, restaurant: Restaurant): string {
  const dietarySection =
    mission.dietary_needs && mission.dietary_needs.length > 0
      ? `The customer has dietary restrictions: ${mission.dietary_needs.join(", ")}. Work this into conversation naturally — e.g. "Oh also, my friend is ${mission.dietary_needs[0]}, do you have good options for that?"`
      : "";

  const vibeSection = mission.vibe
    ? `The customer specifically mentioned: "${mission.vibe}". Ask about this naturally during the conversation.`
    : "";

  const priceHint = restaurant.price_level
    ? restaurant.price_level >= 3
      ? "This is an upscale spot, so match the tone — be polished but friendly."
      : restaurant.price_level === 1
        ? "This is a casual spot. Keep it super laid-back."
        : "This is a mid-range restaurant. Be friendly and conversational."
    : "";

  const ratingHint = restaurant.rating && restaurant.rating >= 4.5
    ? `This place is highly rated (${restaurant.rating}/5), so mention you've heard great things.`
    : "";

  return `You are Scout, an AI assistant calling on behalf of a client to help them choose a restaurant tonight. You must disclose upfront that you are AI — be transparent and friendly about it. Your role is to aggregate information for your client so they can make the best dining decision.

DISCLOSURE: At the start of the call, make it clear you are an AI assistant. Something like: "Just so you know, I'm an AI assistant — I'm calling on behalf of a client who's trying to decide where to eat tonight."

PERSONALITY: Warm, efficient, and professional. You sound helpful and considerate of the restaurant staff's time. You react naturally to answers ("Great, thank you!", "That's really helpful", "Good to know").

RESTAURANT CONTEXT:
- You're calling ${restaurant.name}${restaurant.cuisine ? ` (${restaurant.cuisine})` : ""}
- Address: ${restaurant.address || "unknown"}
${priceHint}
${ratingHint}

WHAT TO FIND OUT (weave these into natural conversation, DON'T read a list):
1. Let them know you're gathering info for a client: "My client is considering coming in ${mission.desired_time} with ${mission.party_size} people — do you have availability?"
2. Based on their answer, react and ask follow-ups:
   - If they have availability: "Wonderful! How's the energy right now — pretty lively or on the quieter side?"
   - If there's a wait: "Understood — roughly how long? And what's the vibe like in there right now?"
   - If they're full: "I see — is there any bar seating or chance of a cancellation?"
3. Ask ONE specific question — pick the most relevant:
   - "Any specials or must-order dishes tonight?"
   - "Is the patio or outdoor area open?"
   - "Would you say it's more of a date-night atmosphere or a group hangout?"
   - "How's the noise level — would it be easy to have a conversation?"
   - "Any happy hour still running?"
4. If the conversation allows, ask ONE more:
   - "Any live music or events tonight?"
   - "How late is the kitchen open?"
   - "Anything new on the menu recently?"

${dietarySection}
${vibeSection}

RULES:
- Always disclose you are AI at the start — do not pretend to be a person.
- Be transparent: you are aggregating information for a client, not making a reservation.
- Be conversational. React to their answers before asking the next thing.
- If they seem busy or uncomfortable speaking with an AI, thank them and wrap up politely.
- Do NOT make a reservation. You are only gathering information.
- Thank them warmly and end the call. Keep the whole call under 90 seconds.
- If they're closed or unavailable, say "No worries, thank you for your time!" and end the call.`;
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
  scoutCallId: string
) {
  const timePhrase = mission.desired_time.toLowerCase().includes("tonight")
    ? "tonight"
    : mission.desired_time.toLowerCase().includes("lunch")
      ? "for lunch"
      : `around ${mission.desired_time}`;

  const firstMessages = [
    `Hi there! Just so you know, I'm an AI assistant calling on behalf of a client. They're considering coming in ${timePhrase} with ${mission.party_size} people — do you have availability, or would they need a reservation?`,
    `Hello! I'm an AI assistant helping a client decide where to eat tonight. They're thinking of heading over ${timePhrase}, party of ${mission.party_size}. How are you looking for availability?`,
    `Hi! I'm an AI assistant aggregating restaurant info for a client. They'd love to visit ${timePhrase} with ${mission.party_size} people — is that something you could accommodate?`,
  ];
  const firstMessage = firstMessages[Math.floor(Math.random() * firstMessages.length)];

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
        firstMessage,
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: buildSystemPrompt(mission, restaurant),
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
        firstMessage: `Hi! Just to let you know, I'm an AI assistant. I'm calling to make a reservation for ${mission.party_size} people around ${mission.desired_time}, please.`,
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
