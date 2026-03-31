import { NextRequest, NextResponse } from "next/server";
import { searchRestaurants } from "@/lib/google-places";

export async function GET(req: NextRequest) {
  const neighborhood = req.nextUrl.searchParams.get("neighborhood");

  if (!neighborhood) {
    return NextResponse.json(
      { error: "neighborhood query param is required" },
      { status: 400 }
    );
  }

  try {
    const places = await searchRestaurants(neighborhood);
    return NextResponse.json({ restaurants: places });
  } catch (err) {
    console.error("Restaurant search failed:", err);
    return NextResponse.json(
      { error: "Failed to search restaurants" },
      { status: 500 }
    );
  }
}
