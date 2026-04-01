import { NextRequest, NextResponse } from "next/server";

const BASE = "https://maps.googleapis.com/maps/api/place";
const KEY = process.env.GOOGLE_PLACES_API_KEY!;

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("place_id");
  if (!placeId) {
    return NextResponse.json({ error: "place_id required" }, { status: 400 });
  }

  const fields =
    "place_id,name,formatted_address,formatted_phone_number,international_phone_number,rating,price_level,photos,geometry,types,opening_hours";
  const url = `${BASE}/details/json?place_id=${placeId}&fields=${fields}&key=${KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json({ error: "Places API failed" }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({ result: data.result || null });
}
