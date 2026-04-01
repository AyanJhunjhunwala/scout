export interface User {
  id: string;
  email: string;
  name: string | null;
  dietary_restrictions: string[] | null;
  created_at: string;
}

export interface Restaurant {
  id: string;
  google_place_id: string;
  name: string;
  phone: string;
  address: string | null;
  cuisine: string | null;
  rating: number | null;
  price_level: number | null;
  photo_ref: string | null;
  lat: number | null;
  lng: number | null;
  cached_at: string;
}

export interface Mission {
  id: string;
  user_id: string;
  raw_query: string | null;
  party_size: number;
  desired_time: string;
  neighborhood: string;
  vibe: string | null;
  dietary_needs: string[] | null;
  status: MissionStatus;
  created_at: string;
}

export type MissionStatus = "pending" | "calling" | "complete" | "failed";

export interface ScoutCall {
  id: string;
  mission_id: string;
  restaurant_id: string;
  vapi_call_id: string | null;
  status: CallStatus;
  transcript: string | null;
  wait_time: string | null;
  vibe_report: string | null;
  menu_notes: string | null;
  availability: string | null;
  special_notes: string | null;
  recommendation: Recommendation | null;
  recommendation_reason: string | null;
  call_summary: string | null;
  highlights: string[] | null;
  noise_level: "quiet" | "moderate" | "loud" | null;
  crowd_level: "empty" | "moderate" | "busy" | "packed" | null;
  outdoor_seating: boolean | null;
  bar_seating: boolean | null;
  vibe_tags: string[] | null;
  price_per_person: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  completed_at: string | null;
  listen_url: string | null;
  restaurant?: Restaurant;
}

export type CallStatus =
  | "queued"
  | "ringing"
  | "connected"
  | "ended"
  | "no_answer"
  | "voicemail"
  | "failed";

export type Recommendation = "best_bet" | "worth_it" | "skip";

export interface MissionWithCalls extends Mission {
  scout_calls: (ScoutCall & { restaurant: Restaurant })[];
}

export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  rating?: number;
  price_level?: number;
  photos?: { photo_reference: string }[];
  geometry?: {
    location: { lat: number; lng: number };
  };
  types?: string[];
  opening_hours?: {
    open_now?: boolean;
  };
}

export interface CallExtraction {
  wait_time: string | null;
  vibe: string | null;
  menu_notes: string | null;
  availability: string | null;
  dietary_safe: boolean | null;
  recommendation: Recommendation;
  recommendation_reason: string;
  special_notes: string | null;
  call_summary: string | null;
  highlights: string[] | null;
  noise_level: "quiet" | "moderate" | "loud" | null;
  crowd_level: "empty" | "moderate" | "busy" | "packed" | null;
  outdoor_seating: boolean | null;
  bar_seating: boolean | null;
  vibe_tags: string[] | null;
  price_per_person: string | null;
}

export interface TasteProfile {
  neighborhoods: Record<string, number>;
  vibes: Record<string, number>;
  times: Record<string, number>;
  party_sizes: Record<string, number>;
  features: { outdoor_seating: number; bar_seating: number };
  price_levels: Record<string, number>;
  cuisines: Record<string, number>;
  total_missions: number;
  total_bookings: number;
}

export interface CreateMissionInput {
  neighborhood: string;
  party_size: number;
  desired_time: string;
  vibe?: string;
  dietary_needs?: string[];
}

export interface LaunchMissionInput {
  restaurant_ids: string[];
}
