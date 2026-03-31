import type { Restaurant, Mission } from "./types";

const OT_BASE = "https://www.opentable.com";
const SF_METRO_ID = 4;

export function buildOpenTableSearchUrl(
  restaurant: Restaurant,
  mission: Mission
): string {
  const params = new URLSearchParams({
    term: restaurant.name,
    covers: String(mission.party_size || 2),
    metroId: String(SF_METRO_ID),
  });

  const dt = parseDesiredTime(mission.desired_time);
  if (dt) params.set("dateTime", dt);

  return `${OT_BASE}/s?${params.toString()}`;
}

export function buildOpenTableDirectUrl(restaurantName: string): string {
  const slug = restaurantName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
  return `${OT_BASE}/${slug}`;
}

function parseDesiredTime(time: string | null): string | null {
  if (!time) return null;

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const hourMatch = time.match(/(\d{1,2})(?::(\d{2}))?\s*(pm|am)?/i);
  if (hourMatch) {
    let hour = parseInt(hourMatch[1], 10);
    const min = hourMatch[2] || "00";
    const ampm = hourMatch[3]?.toLowerCase();
    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;
    if (!ampm && hour < 12 && hour < 6) hour += 12; // assume PM for small numbers
    return `${today}T${String(hour).padStart(2, "0")}:${min}`;
  }

  if (/tonight|dinner|evening/i.test(time)) return `${today}T19:00`;
  if (/lunch/i.test(time)) return `${today}T12:00`;
  if (/brunch/i.test(time)) return `${today}T11:00`;

  return `${today}T19:00`;
}
