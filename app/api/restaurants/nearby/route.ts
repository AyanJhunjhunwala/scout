import { NextRequest, NextResponse } from "next/server";

const BASE = "https://maps.googleapis.com/maps/api/place";
const KEY = process.env.GOOGLE_PLACES_API_KEY!;

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
  const results = (data.results || []).slice(0, 20).map((r: Record<string, unknown>) => ({
    place_id: r.place_id,
    name: r.name,
    vicinity: r.vicinity,
    rating: r.rating || null,
    price_level: r.price_level || null,
    lat: (r.geometry as { location: { lat: number; lng: number } })?.location?.lat,
    lng: (r.geometry as { location: { lat: number; lng: number } })?.location?.lng,
    photo_ref: (r.photos as { photo_reference: string }[])?.[0]?.photo_reference || null,
    open_now: (r.opening_hours as { open_now?: boolean })?.open_now ?? null,
    user_ratings_total: r.user_ratings_total || 0,
  }));

  return NextResponse.json({ results });
}
