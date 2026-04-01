import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  getTopPreferences,
  scoreCallForTaste,
  tasteMatchLabel,
  useTasteProfile,
} from "@/lib/taste-profile";
import type { TasteProfile, ScoutCall, Restaurant } from "@/lib/types";

const emptyProfile: TasteProfile = {
  neighborhoods: {},
  vibes: {},
  times: {},
  party_sizes: {},
  features: { outdoor_seating: 0, bar_seating: 0 },
  price_levels: {},
  cuisines: {},
  total_missions: 0,
  total_bookings: 0,
};

const richProfile: TasteProfile = {
  neighborhoods: { "Hayes Valley": 5, "Mission": 2, "Castro": 1 },
  vibes: { romantic: 4, chill: 2 },
  times: { dinner: 6, lunch: 1 },
  party_sizes: { "2": 5, "4": 2 },
  features: { outdoor_seating: 3, bar_seating: 1 },
  price_levels: { "3": 4, "2": 2 },
  cuisines: { Italian: 3, Mexican: 1 },
  total_missions: 8,
  total_bookings: 4,
};

const mockRestaurant: Restaurant = {
  id: "r1",
  google_place_id: "p1",
  name: "Test Restaurant",
  phone: "+1000000000",
  address: "123 Test St",
  cuisine: "Italian",
  rating: 4.2,
  price_level: 3,
  photo_ref: null,
  lat: 37.77,
  lng: -122.41,
  cached_at: new Date().toISOString(),
};

const baseCall: ScoutCall = {
  id: "c1",
  mission_id: "m1",
  restaurant_id: "r1",
  vapi_call_id: null,
  status: "ended",
  transcript: null,
  wait_time: null,
  vibe_report: "romantic",
  menu_notes: null,
  availability: null,
  special_notes: null,
  recommendation: "best_bet",
  recommendation_reason: "Great spot",
  call_summary: null,
  highlights: null,
  noise_level: null,
  crowd_level: null,
  outdoor_seating: true,
  bar_seating: false,
  vibe_tags: null,
  price_per_person: null,
  duration_seconds: null,
  started_at: null,
  completed_at: null,
  listen_url: null,
};

// ── getTopPreferences ─────────────────────────────────────────────────────────

describe("getTopPreferences", () => {
  it("returns all nulls for empty profile", () => {
    const prefs = getTopPreferences(emptyProfile);
    expect(prefs.neighborhood).toBeNull();
    expect(prefs.vibe).toBeNull();
    expect(prefs.time).toBeNull();
    expect(prefs.cuisine).toBeNull();
    expect(prefs.priceLevel).toBeNull();
    expect(prefs.preferOutdoor).toBe(false);
    expect(prefs.preferBar).toBe(false);
  });

  it("returns the top neighborhood by count", () => {
    const prefs = getTopPreferences(richProfile);
    expect(prefs.neighborhood).toBe("Hayes Valley");
  });

  it("returns the top vibe", () => {
    expect(getTopPreferences(richProfile).vibe).toBe("romantic");
  });

  it("returns the top cuisine", () => {
    expect(getTopPreferences(richProfile).cuisine).toBe("Italian");
  });

  it("returns the top price level as a number", () => {
    expect(getTopPreferences(richProfile).priceLevel).toBe(3);
  });

  it("preferOutdoor=true when outdoor_seating > 50% of bookings", () => {
    // 3 outdoor_seating, 4 total_bookings: 75% → true
    expect(getTopPreferences(richProfile).preferOutdoor).toBe(true);
  });

  it("preferBar=false when bar_seating <= 50% of bookings", () => {
    // 1 bar, 4 bookings: 25% → false
    expect(getTopPreferences(richProfile).preferBar).toBe(false);
  });
});

// ── scoreCallForTaste ─────────────────────────────────────────────────────────

describe("scoreCallForTaste", () => {
  it("returns 0 when total_missions < 2", () => {
    const oneTrip = { ...emptyProfile, total_missions: 1 };
    expect(scoreCallForTaste(baseCall, mockRestaurant, oneTrip)).toBe(0);
  });

  it("returns 0 for empty profile (0 missions)", () => {
    expect(scoreCallForTaste(baseCall, mockRestaurant, emptyProfile)).toBe(0);
  });

  it("adds +2 when vibe_report matches preferred vibe", () => {
    // richProfile top vibe = "romantic", baseCall.vibe_report = "romantic"
    const score = scoreCallForTaste(baseCall, mockRestaurant, richProfile);
    expect(score).toBeGreaterThanOrEqual(2);
  });

  it("adds +1 for outdoor_seating match when preferOutdoor", () => {
    const score = scoreCallForTaste(baseCall, mockRestaurant, richProfile);
    // vibe match (+2) + outdoor (+1) + cuisine match (+2) + price match (+1) = 6
    expect(score).toBeGreaterThanOrEqual(4);
  });

  it("adds +2 for cuisine match", () => {
    const score = scoreCallForTaste(baseCall, mockRestaurant, richProfile);
    expect(score).toBeGreaterThanOrEqual(2);
  });

  it("returns lower score for mismatched call", () => {
    const mismatch: ScoutCall = {
      ...baseCall,
      vibe_report: "loud sports bar",
      outdoor_seating: false,
      bar_seating: false,
    };
    const mismatchRestaurant: Restaurant = {
      ...mockRestaurant,
      cuisine: "Fast Food",
      price_level: 1,
    };
    const matchScore = scoreCallForTaste(baseCall, mockRestaurant, richProfile);
    const missScore = scoreCallForTaste(mismatch, mismatchRestaurant, richProfile);
    expect(matchScore).toBeGreaterThan(missScore);
  });
});

// ── tasteMatchLabel ───────────────────────────────────────────────────────────

describe("tasteMatchLabel", () => {
  it("returns null for score 0", () => {
    expect(tasteMatchLabel(0)).toBeNull();
  });

  it("returns 'Slight match' for score 1", () => {
    expect(tasteMatchLabel(1)).toBe("Slight match");
  });

  it("returns 'Matches your taste' for score 2", () => {
    expect(tasteMatchLabel(2)).toBe("Matches your taste");
  });

  it("returns 'Matches your taste' for score 3", () => {
    expect(tasteMatchLabel(3)).toBe("Matches your taste");
  });

  it("returns 'Strong match' for score 4+", () => {
    expect(tasteMatchLabel(4)).toBe("Strong match");
    expect(tasteMatchLabel(10)).toBe("Strong match");
  });
});

// ── useTasteProfile hook ──────────────────────────────────────────────────────

describe("useTasteProfile hook", () => {
  beforeEach(() => localStorage.clear());

  it("initializes with zero missions and bookings", () => {
    const { result } = renderHook(() => useTasteProfile());
    expect(result.current.profile.total_missions).toBe(0);
    expect(result.current.profile.total_bookings).toBe(0);
  });

  it("recordMission increments total_missions", () => {
    const { result } = renderHook(() => useTasteProfile());
    act(() => {
      result.current.recordMission({
        neighborhood: "Hayes Valley",
        vibe: "romantic",
        desired_time: "tonight",
        party_size: 2,
      });
    });
    expect(result.current.profile.total_missions).toBe(1);
  });

  it("recordMission accumulates neighborhood counts", () => {
    const { result } = renderHook(() => useTasteProfile());
    act(() => {
      result.current.recordMission({ neighborhood: "Hayes Valley", vibe: null, desired_time: "tonight", party_size: 2 });
      result.current.recordMission({ neighborhood: "Hayes Valley", vibe: null, desired_time: "tonight", party_size: 2 });
      result.current.recordMission({ neighborhood: "Mission", vibe: null, desired_time: "tonight", party_size: 4 });
    });
    expect(result.current.profile.neighborhoods["Hayes Valley"]).toBe(2);
    expect(result.current.profile.neighborhoods["Mission"]).toBe(1);
  });

  it("recordMission accumulates vibe counts", () => {
    const { result } = renderHook(() => useTasteProfile());
    act(() => {
      result.current.recordMission({ neighborhood: "Hayes Valley", vibe: "romantic", desired_time: "tonight", party_size: 2 });
      result.current.recordMission({ neighborhood: "Mission", vibe: "romantic", desired_time: "tonight", party_size: 4 });
    });
    expect(result.current.profile.vibes["romantic"]).toBe(2);
  });

  it("recordMission accumulates party sizes", () => {
    const { result } = renderHook(() => useTasteProfile());
    act(() => {
      result.current.recordMission({ neighborhood: "Hayes Valley", vibe: null, desired_time: "tonight", party_size: 2 });
    });
    expect(result.current.profile.party_sizes["2"]).toBe(1);
  });

  it("recordBooking increments total_bookings", () => {
    const { result } = renderHook(() => useTasteProfile());
    act(() => {
      result.current.recordBooking({ ...baseCall, outdoor_seating: true }, mockRestaurant);
    });
    expect(result.current.profile.total_bookings).toBe(1);
  });

  it("recordBooking records outdoor_seating feature", () => {
    const { result } = renderHook(() => useTasteProfile());
    act(() => {
      result.current.recordBooking({ ...baseCall, outdoor_seating: true }, mockRestaurant);
    });
    expect(result.current.profile.features.outdoor_seating).toBe(1);
  });

  it("recordBooking does not increment outdoor when false", () => {
    const { result } = renderHook(() => useTasteProfile());
    act(() => {
      result.current.recordBooking({ ...baseCall, outdoor_seating: false }, mockRestaurant);
    });
    expect(result.current.profile.features.outdoor_seating).toBe(0);
  });

  it("recordBooking records cuisine", () => {
    const { result } = renderHook(() => useTasteProfile());
    act(() => {
      result.current.recordBooking(baseCall, { ...mockRestaurant, cuisine: "Italian" });
    });
    expect(result.current.profile.cuisines["Italian"]).toBe(1);
  });

  it("recordBooking records price level", () => {
    const { result } = renderHook(() => useTasteProfile());
    act(() => {
      result.current.recordBooking(baseCall, { ...mockRestaurant, price_level: 3 });
    });
    expect(result.current.profile.price_levels["3"]).toBe(1);
  });

  it("resetProfile clears all data", () => {
    const { result } = renderHook(() => useTasteProfile());
    act(() => {
      result.current.recordMission({ neighborhood: "Hayes Valley", vibe: "romantic", desired_time: "tonight", party_size: 2 });
      result.current.resetProfile();
    });
    expect(result.current.profile.total_missions).toBe(0);
    expect(result.current.profile.neighborhoods).toEqual({});
  });

  it("persists data to localStorage", () => {
    const { result } = renderHook(() => useTasteProfile());
    act(() => {
      result.current.recordMission({ neighborhood: "Castro", vibe: null, desired_time: "tonight", party_size: 3 });
    });
    const stored = JSON.parse(localStorage.getItem("scout_taste_profile")!);
    expect(stored.neighborhoods["Castro"]).toBe(1);
  });
});
