import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref");
  const maxWidth = req.nextUrl.searchParams.get("w") || "400";

  if (!ref) {
    return NextResponse.json({ error: "ref required" }, { status: 400 });
  }

  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${ref}&key=${process.env.GOOGLE_PLACES_API_KEY}`;

  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    return NextResponse.json({ error: "Photo fetch failed" }, { status: 502 });
  }

  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
