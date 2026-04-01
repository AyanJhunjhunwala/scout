import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { searchRestaurants } from "@/lib/google-places";
import { formatPhoneForVapi } from "@/lib/google-places";
import type { CreateMissionInput, PlaceResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body: CreateMissionInput = await req.json();
  const { neighborhood, party_size, desired_time, vibe, dietary_needs } = body;

  if (!neighborhood || !party_size || !desired_time) {
    return NextResponse.json(
      { error: "neighborhood, party_size, and desired_time are required" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdmin();

  try {
    const places = await searchRestaurants(neighborhood, desired_time);

    const restaurantRows = await Promise.all(
      places.map(async (place: PlaceResult) => {
        const phone = formatPhoneForVapi(
          place.international_phone_number || place.formatted_phone_number || ""
        );

        const { data, error } = await supabase
          .from("restaurants")
          .upsert(
            {
              google_place_id: place.place_id,
              name: place.name,
              phone,
              address: place.formatted_address,
              rating: place.rating || null,
              price_level: place.price_level || null,
              photo_ref: place.photos?.[0]?.photo_reference || null,
              lat: place.geometry?.location.lat || null,
              lng: place.geometry?.location.lng || null,
              cached_at: new Date().toISOString(),
            },
            { onConflict: "google_place_id" }
          )
          .select()
          .single();

        if (error) throw error;
        return data;
      })
    );

    const { data: mission, error: missionError } = await supabase
      .from("missions")
      .insert({
        raw_query: `${neighborhood}, ${party_size} people, ${desired_time}, ${vibe || "any vibe"}`,
        party_size,
        desired_time,
        neighborhood,
        vibe: vibe || null,
        dietary_needs: dietary_needs || null,
        status: "pending",
      })
      .select()
      .single();

    if (missionError) throw missionError;

    return NextResponse.json({
      mission,
      restaurants: restaurantRows,
    });
  } catch (err) {
    console.error("Create mission failed:", err);
    return NextResponse.json(
      { error: "Failed to create mission" },
      { status: 500 }
    );
  }
}
