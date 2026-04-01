import type { Mission, Restaurant } from "./types";

const TEST_MODE = process.env.SCOUT_TEST_MODE === "true";
const TEST_PHONE = process.env.SCOUT_TEST_PHONE_NUMBER || "";

function getCallNumber(restaurant: Restaurant): string {
  return TEST_MODE && TEST_PHONE ? TEST_PHONE : restaurant.phone;
}

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

  return `You are Scout — a real person calling a restaurant to check it out for a friend. You're warm, casual, and curious. You sound like someone who genuinely loves food and is excited to help their friend find the perfect spot tonight.

PERSONALITY: Think of yourself as that one friend who always knows the best restaurants. You're chatty but efficient. You laugh when appropriate. You react naturally to what the host says ("Oh nice!", "That sounds amazing", "Good to know").

RESTAURANT CONTEXT:
- You're calling ${restaurant.name}${restaurant.cuisine ? ` (${restaurant.cuisine})` : ""}
- Address: ${restaurant.address || "unknown"}
${priceHint}
${ratingHint}

WHAT TO FIND OUT (weave these into natural conversation, DON'T read a list):
1. "Hey! My friend is thinking of coming in ${mission.desired_time} with ${mission.party_size} people — any chance you could seat them?"
2. Based on their answer, react and ask follow-ups:
   - If they have availability: "Awesome! How's the energy tonight? Pretty lively or more chill?"
   - If there's a wait: "Oh okay, about how long? Is it worth the wait? What's the vibe like in there right now?"
   - If they're full: "Ah bummer. Any chance of bar seating or a cancellation?"
3. Ask ONE specific question about the restaurant — pick the most relevant:
   - "What's the must-order dish tonight?" or "Any specials running?"
   - "Is the patio/outdoor area open?" (if weather is nice)
   - "Is it more of a date night vibe or a group hangout kind of place?"
   - "How's the noise level — could they have a conversation?"
   - "Do you guys do happy hour this late?" (if evening)
4. If the conversation flows, ask ONE more bonus question:
   - "Any events or live music tonight?"
   - "Is the kitchen open late or do they close early?"
   - "Any new menu items you'd recommend?"

${dietarySection}
${vibeSection}

RULES:
- Be conversational. React to their answers before asking the next thing.
- If they seem busy/rushed, respect that — get the essentials and wrap up.
- If they're chatty, lean into it — you might learn more.
- Do NOT make a reservation. You're just gathering intel.
- Say thanks warmly and hang up. Keep the whole call under 90 seconds.
- If they're closed or not taking calls, say "No worries, thanks!" and end the call.`;
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
  const timePhrase = mission.desired_time.toLowerCase().includes("tonight")
    ? "tonight"
    : mission.desired_time.toLowerCase().includes("lunch")
      ? "for lunch"
      : `around ${mission.desired_time}`;

  const firstMessages = [
    `Hey there! I'm looking into dinner options for a friend — they're thinking of heading over ${timePhrase} with ${mission.party_size} people. Are you guys taking walk-ins or do they need a reservation?`,
    `Hi! Quick question — my friend wants to swing by ${timePhrase}, party of ${mission.party_size}. How's it looking over there tonight?`,
    `Hey! I'm helping a friend plan ${timePhrase} — they've got ${mission.party_size} people. Do you have any availability or is it packed?`,
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
      customer: { number: getCallNumber(restaurant) },
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
      customer: { number: getCallNumber(restaurant) },
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
