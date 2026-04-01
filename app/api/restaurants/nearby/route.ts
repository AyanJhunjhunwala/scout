import { NextRequest, NextResponse } from "next/server";

const BASE = "https://maps.googleapis.com/maps/api/place";
const KEY = process.env.GOOGLE_PLACES_API_KEY!;
type NearbyResult = {
  place_id: unknown;
  name: unknown;
  vicinity: string;
  rating: unknown;
  price_level: unknown;
  lat: number | undefined;
  lng: number | undefined;
  photo_ref: string | null;
  open_now: boolean | null;
  user_ratings_total: unknown;
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius") || "1500";

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const url = `${BASE}/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=restaurant&key=${KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json({ error: "Places API failed" }, { status: 502 });
  }

  const data = await res.json();
  const raw: NearbyResult[] = (data.results || []).slice(0, 20).map((r: Record<string, unknown>) => ({
    place_id: r.place_id,
    name: r.name,
    vicinity: String(r.vicinity || ""),
    rating: r.rating || null,
    price_level: r.price_level || null,
    lat: (r.geometry as { location: { lat: number; lng: number } })?.location?.lat,
    lng: (r.geometry as { location: { lat: number; lng: number } })?.location?.lng,
    photo_ref: (r.photos as { photo_reference: string }[])?.[0]?.photo_reference || null,
    open_now: (r.opening_hours as { open_now?: boolean })?.open_now ?? null,
    user_ratings_total: r.user_ratings_total || 0,
  }));
  const enriched = await Promise.all(
    raw.map(async (r: NearbyResult) => {
      const addr = await getFormattedAddress(String(r.place_id));
      return { ...r, formatted_address: addr };
    })
  );
  const results = enriched.filter((r) => {
    const zip = extractZip(r.formatted_address || r.vicinity);
    return !!zip && (zip.startsWith("94") || zip.startsWith("95"));
  });

  return NextResponse.json({ results });
}

async function getFormattedAddress(placeId: string): Promise<string | null> {
  const fields = "formatted_address";
  const url = `${BASE}/details/json?place_id=${placeId}&fields=${fields}&key=${KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.result?.formatted_address || null;
}

function extractZip(text: string): string | null {
  const m = text.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : null;
}
