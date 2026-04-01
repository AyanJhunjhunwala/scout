import type { PlaceResult } from "./types";

const BASE_URL = "https://maps.googleapis.com/maps/api/place";

export async function searchRestaurants(
  neighborhood: string,
  desiredTime?: string
): Promise<PlaceResult[]> {
  const query = encodeURIComponent(`restaurants in ${neighborhood}, San Francisco Bay Area, CA`);
  const url = `${BASE_URL}/textsearch/json?query=${query}&type=restaurant&key=${process.env.GOOGLE_PLACES_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Places text search failed: ${res.status}`);

  const data = await res.json();
  const results: PlaceResult[] = data.results || [];

  const detailed = await Promise.all(
    results.slice(0, 10).map((r: PlaceResult) => getPlaceDetails(r.place_id))
  );

  const withPhone = detailed.filter(
    (d): d is PlaceResult => d !== null && !!d.formatted_phone_number
  );
  const bayOnly = withPhone.filter((place) =>
    isAllowedBayZip(place.formatted_address || "")
  );

  if (!desiredTime) return bayOnly;

  const target = parseDesiredTime(desiredTime);
  if (!target) return bayOnly;

  // Keep restaurants that are open at the target time, or where we have no hours data
  return bayOnly.filter((place) => isOpenAt(place, target));
}

function isAllowedBayZip(address: string): boolean {
  const zip = extractZip(address);
  if (!zip) return false;
  return zip.startsWith("94") || zip.startsWith("95");
}

function extractZip(address: string): string | null {
  const m = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : null;
}

async function getPlaceDetails(
  placeId: string
): Promise<PlaceResult | null> {
  const fields =
    "place_id,name,formatted_address,formatted_phone_number,international_phone_number,rating,price_level,photos,geometry,types,opening_hours";
  const url = `${BASE_URL}/details/json?place_id=${placeId}&fields=${fields}&key=${process.env.GOOGLE_PLACES_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  return data.result || null;
}

export function getPhotoUrl(
  photoRef: string,
  maxWidth: number = 400
): string {
  return `${BASE_URL}/photo?maxwidth=${maxWidth}&photo_reference=${photoRef}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
}

/** { day: 0=Sun..6=Sat, hhmm: "1930" } */
interface TargetTime {
  day: number;
  hhmm: string;
}

/**
 * Parse a desired_time string (from parse-local) into a day-of-week + HHMM.
 * Returns null if we can't confidently determine a time (→ no filtering).
 */
export function parseDesiredTime(desiredTime: string): TargetTime | null {
  const lc = desiredTime.toLowerCase().trim();
  const now = new Date();

  let dayOffset = 0;
  let hour: number | null = null;
  let minute = 0;

  // Day offset hints
  if (lc.includes("tomorrow")) dayOffset = 1;
  else if (lc.includes("friday")) dayOffset = daysUntil(5, now);
  else if (lc.includes("saturday")) dayOffset = daysUntil(6, now);
  else if (lc.includes("sunday")) dayOffset = daysUntil(0, now);

  // Named meal slots
  if (lc.includes("brunch")) { hour = 11; minute = 0; }
  else if (lc.includes("lunch")) { hour = 12; minute = 0; }
  else if (lc.includes("late night")) { hour = 22; minute = 0; }
  else if (lc.includes("dinner") || lc.includes("tonight") || lc.includes("evening")) {
    hour = 19; minute = 0;
  }

  // Explicit time: "around 8:30pm", "7pm", "19:00", etc.
  const timeMatch = lc.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3];
    if (ampm === "pm" && h < 12) h += 12;
    else if (ampm === "am" && h === 12) h = 0;
    // No am/pm: 1–9 in a restaurant context almost always means PM
    else if (!ampm && h >= 1 && h <= 9) h += 12;
    hour = h;
    minute = m;
  }

  // Day specified but no time → default to dinner
  if (hour === null && dayOffset > 0) hour = 19;

  if (hour === null) return null;

  const target = new Date(now);
  target.setDate(now.getDate() + dayOffset);
  target.setHours(hour, minute, 0, 0);

  return {
    day: target.getDay(), // 0=Sun
    hhmm: `${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}`,
  };
}

function daysUntil(targetDay: number, from: Date): number {
  const diff = (targetDay - from.getDay() + 7) % 7;
  return diff === 0 ? 7 : diff; // if today is that day, assume next week
}

/**
 * Returns true if the place is open at the given target time.
 * If no hours data is available, returns true (don't filter unknowns).
 */
function isOpenAt(place: PlaceResult, target: TargetTime): boolean {
  const periods = place.opening_hours?.periods;

  if (!periods || periods.length === 0) return true;

  // 24/7: single period with open day=0 time="0000" and no close
  if (periods.length === 1 && periods[0].open.time === "0000" && !periods[0].close) {
    return true;
  }

  for (const period of periods) {
    if (period.open.day !== target.day) continue;
    if (!period.close) return true; // open-ended for this day

    const openTime = period.open.time;   // e.g. "1100"
    const closeTime = period.close.time; // e.g. "2200"

    // Handle overnight close (e.g. open 17:00, close 02:00 next day)
    if (closeTime <= openTime) {
      // Open if target >= open OR target < close
      if (target.hhmm >= openTime || target.hhmm < closeTime) return true;
    } else {
      if (target.hhmm >= openTime && target.hhmm < closeTime) return true;
    }
  }

  return false;
}

export function formatPhoneForVapi(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}
