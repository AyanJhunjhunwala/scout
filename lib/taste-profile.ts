"use client";

import { useState, useEffect, useCallback } from "react";
import type { TasteProfile, ScoutCall, Restaurant, Mission } from "./types";

const STORAGE_KEY = "scout_taste_profile";

const DEFAULT_PROFILE: TasteProfile = {
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

function loadProfile(): TasteProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function saveProfile(profile: TasteProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

function increment(map: Record<string, number>, key: string | null | undefined, amount = 1) {
  if (!key) return map;
  return { ...map, [key]: (map[key] || 0) + amount };
}

export function useTasteProfile() {
  const [profile, setProfile] = useState<TasteProfile>(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setLoaded(true);
  }, []);

  const recordMission = useCallback((mission: Pick<Mission, "neighborhood" | "vibe" | "desired_time" | "party_size">) => {
    setProfile((prev) => {
      const updated: TasteProfile = {
        ...prev,
        neighborhoods: increment(prev.neighborhoods, mission.neighborhood),
        vibes: increment(prev.vibes, mission.vibe),
        times: increment(prev.times, normalizeTime(mission.desired_time)),
        party_sizes: increment(prev.party_sizes, String(mission.party_size)),
        total_missions: prev.total_missions + 1,
      };
      saveProfile(updated);
      return updated;
    });
  }, []);

  const recordBooking = useCallback((call: ScoutCall, restaurant: Restaurant) => {
    setProfile((prev) => {
      const updated: TasteProfile = {
        ...prev,
        features: {
          outdoor_seating: prev.features.outdoor_seating + (call.outdoor_seating ? 1 : 0),
          bar_seating: prev.features.bar_seating + (call.bar_seating ? 1 : 0),
        },
        price_levels: increment(prev.price_levels, restaurant.price_level != null ? String(restaurant.price_level) : null),
        cuisines: increment(prev.cuisines, restaurant.cuisine),
        total_bookings: prev.total_bookings + 1,
      };
      saveProfile(updated);
      return updated;
    });
  }, []);

  const resetProfile = useCallback(() => {
    saveProfile(DEFAULT_PROFILE);
    setProfile(DEFAULT_PROFILE);
  }, []);

  return { profile, loaded, recordMission, recordBooking, resetProfile };
}

function normalizeTime(time: string): string {
  const lc = time.toLowerCase();
  if (lc.includes("lunch") || lc.includes("noon") || (lc.includes("12") && lc.includes("pm"))) return "lunch";
  if (lc.includes("brunch")) return "brunch";
  if (lc.includes("late") || (parseInt(lc) >= 21)) return "late night";
  return "dinner";
}

export function getTopPreferences(profile: TasteProfile): {
  neighborhood: string | null;
  vibe: string | null;
  time: string | null;
  preferOutdoor: boolean;
  preferBar: boolean;
  cuisine: string | null;
  priceLevel: number | null;
} {
  return {
    neighborhood: topKey(profile.neighborhoods),
    vibe: topKey(profile.vibes),
    time: topKey(profile.times),
    preferOutdoor: profile.features.outdoor_seating > profile.total_bookings * 0.5,
    preferBar: profile.features.bar_seating > profile.total_bookings * 0.5,
    cuisine: topKey(profile.cuisines),
    priceLevel: topKey(profile.price_levels) ? parseInt(topKey(profile.price_levels)!) : null,
  };
}

export function scoreCallForTaste(call: ScoutCall, restaurant: Restaurant, profile: TasteProfile): number {
  if (profile.total_missions < 2) return 0;
  let score = 0;
  const prefs = getTopPreferences(profile);

  if (prefs.vibe && call.vibe_report?.toLowerCase().includes(prefs.vibe.toLowerCase())) score += 2;
  if (prefs.preferOutdoor && call.outdoor_seating) score += 1;
  if (prefs.preferBar && call.bar_seating) score += 1;
  if (prefs.cuisine && restaurant.cuisine?.toLowerCase().includes(prefs.cuisine.toLowerCase())) score += 2;
  if (prefs.priceLevel != null && restaurant.price_level === prefs.priceLevel) score += 1;

  return score;
}

export function tasteMatchLabel(score: number): string | null {
  if (score >= 4) return "Strong match";
  if (score >= 2) return "Matches your taste";
  if (score >= 1) return "Slight match";
  return null;
}

function topKey(map: Record<string, number>): string | null {
  const entries = Object.entries(map).filter(([, v]) => v > 0);
  if (entries.length === 0) return null;
  return entries.sort(([, a], [, b]) => b - a)[0][0];
}
