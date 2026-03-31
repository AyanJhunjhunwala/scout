import type { PlaceResult } from "./types";

const BASE_URL = "https://maps.googleapis.com/maps/api/place";

export async function searchRestaurants(
  neighborhood: string
): Promise<PlaceResult[]> {
  const query = encodeURIComponent(`restaurants in ${neighborhood}`);
  const url = `${BASE_URL}/textsearch/json?query=${query}&type=restaurant&key=${process.env.GOOGLE_PLACES_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Places text search failed: ${res.status}`);

  const data = await res.json();
  const results: PlaceResult[] = data.results || [];

  const detailed = await Promise.all(
    results.slice(0, 10).map((r: PlaceResult) => getPlaceDetails(r.place_id))
  );

  return detailed.filter(
    (d): d is PlaceResult =>
      d !== null && !!d.formatted_phone_number
  );
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

export function formatPhoneForVapi(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}
