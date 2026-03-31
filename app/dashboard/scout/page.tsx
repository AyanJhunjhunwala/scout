"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScoutInput } from "@/components/scout-input";
import { RestaurantPicker } from "@/components/restaurant-picker";
import type { CreateMissionInput, Restaurant, Mission } from "@/lib/types";

type Step = "input" | "pick" | "launching";

export default function ScoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [step, setStep] = useState<Step>("input");
  const [loading, setLoading] = useState(false);
  const [mission, setMission] = useState<Mission | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  const handleSearch = async (input: CreateMissionInput) => {
    setLoading(true);
    try {
      const res = await fetch("/api/missions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) throw new Error("Failed to create mission");

      const data = await res.json();
      setMission(data.mission);
      setRestaurants(data.restaurants);
      setStep("pick");
    } catch (err) {
      console.error(err);
      alert(
        "Something went wrong searching for restaurants. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = async (restaurantIds: string[]) => {
    if (!mission) return;
    setLoading(true);
    setStep("launching");
    try {
      const res = await fetch(`/api/missions/${mission.id}/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_ids: restaurantIds }),
      });

      if (!res.ok) throw new Error("Failed to launch calls");

      router.push(`/dashboard/mission/${mission.id}`);
    } catch (err) {
      console.error(err);
      alert("Something went wrong launching the calls. Please try again.");
      setStep("pick");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scout</h1>
        <p className="mt-1 text-base text-muted-foreground">
          {step === "input" && "Tell us what you're looking for tonight"}
          {step === "pick" && "Pick the restaurants you want scouted"}
          {step === "launching" && "Launching calls..."}
        </p>
      </div>

      {step === "input" && (
        <ScoutInput
          onSubmit={handleSearch}
          loading={loading}
          initialQuery={initialQuery}
        />
      )}

      {(step === "pick" || step === "launching") && restaurants.length > 0 && (
        <RestaurantPicker
          restaurants={restaurants}
          onLaunch={handleLaunch}
          loading={loading}
        />
      )}
    </div>
  );
}
