"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RestaurantMap, type MapRestaurant } from "@/components/restaurant-map";
import { Button } from "@/components/ui/button";
import {
  Star,
  Phone,
  X,
  Loader2,
  Users,
  Clock,
  ChevronRight,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ScoutForm {
  party_size: number;
  desired_time: string;
  extra_question: string;
}

export default function ExplorePage() {
  const router = useRouter();
  const [picked, setPicked] = useState<MapRestaurant | null>(null);
  const [form, setForm] = useState<ScoutForm>({ party_size: 2, desired_time: "tonight", extra_question: "" });
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScout = useCallback((r: MapRestaurant) => {
    setPicked(r);
    setError(null);
  }, []);

  const handleLaunch = useCallback(async () => {
    if (!picked) return;
    setLaunching(true);
    setError(null);

    try {
      const detailRes = await fetch(`/api/restaurants/details?place_id=${picked.place_id}`);
      const detailData = await detailRes.json();
      const place = detailData.result;

      if (!place?.formatted_phone_number) {
        setError("No phone number found for this restaurant.");
        setLaunching(false);
        return;
      }

      const createRes = await fetch("/api/missions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          neighborhood: picked.vicinity || "San Francisco",
          party_size: form.party_size,
          desired_time: form.desired_time,
          vibe: form.extra_question || undefined,
        }),
      });

      if (!createRes.ok) {
        const d = await createRes.json();
        setError(d.error || "Failed to create mission");
        setLaunching(false);
        return;
      }

      const { mission, restaurants } = await createRes.json();

      const target = restaurants.find(
        (r: { google_place_id: string }) => r.google_place_id === picked.place_id
      );
      const restaurantIds = target
        ? [target.id]
        : restaurants.slice(0, 1).map((r: { id: string }) => r.id);

      const launchRes = await fetch(`/api/missions/${mission.id}/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_ids: restaurantIds }),
      });

      if (!launchRes.ok) {
        setError("Failed to launch calls");
        setLaunching(false);
        return;
      }

      router.push(`/dashboard/mission/${mission.id}`);
    } catch {
      setError("Something went wrong. Try again.");
      setLaunching(false);
    }
  }, [picked, form, router]);

  const timeOptions = [
    "right now",
    "tonight",
    "lunch today",
    "tomorrow evening",
    "this weekend",
  ];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
      {/* Map */}
      <div className="relative flex-1 min-h-[50vh] lg:min-h-0">
        <RestaurantMap onScout={handleScout} />
      </div>

      {/* Side Panel */}
      <div
        className={cn(
          "border-t lg:border-t-0 lg:border-l bg-background transition-all duration-300 overflow-hidden",
          picked ? "h-auto lg:w-[360px]" : "h-0 lg:w-0"
        )}
      >
        {picked && (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="relative">
              {picked.photo_ref ? (
                <img
                  src={`/api/photos?ref=${picked.photo_ref}&w=400`}
                  alt={picked.name}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="flex h-40 items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50">
                  <MapPin className="h-12 w-12 text-orange-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <button
                onClick={() => setPicked(null)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-3 left-3 right-3">
                <h2 className="text-lg font-bold text-white leading-tight drop-shadow">
                  {picked.name}
                </h2>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-white/80">
                  {picked.rating && (
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {picked.rating}
                    </span>
                  )}
                  {picked.price_level && (
                    <span>{"$".repeat(picked.price_level)}</span>
                  )}
                  {picked.open_now !== null && (
                    <span className={picked.open_now ? "text-green-300" : "text-red-300"}>
                      {picked.open_now ? "Open now" : "Closed"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                {picked.vicinity}
              </p>

              {/* Party size */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  Party size
                </label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      onClick={() => setForm((f) => ({ ...f, party_size: n }))}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition-all",
                        form.party_size === n
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  When
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {timeOptions.map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, desired_time: t }))}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                        form.desired_time === t
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* What else to ask */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Anything specific to ask?
                </label>
                <textarea
                  value={form.extra_question}
                  onChange={(e) => setForm((f) => ({ ...f, extra_question: e.target.value }))}
                  placeholder="e.g. Do they have outdoor seating? Any vegan options? Is there live music tonight?"
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-200 resize-none"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </p>
              )}
            </div>

            {/* CTA */}
            <div className="border-t p-4">
              <Button
                onClick={handleLaunch}
                disabled={launching}
                className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white"
              >
                {launching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calling...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4" />
                    Scout {picked.name}
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
