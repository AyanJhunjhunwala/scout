"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveCallCard } from "@/components/live-call-card";
import { MissionComparison } from "@/components/mission-comparison";
import { createSupabaseBrowser } from "@/lib/supabase";
import type { MissionWithCalls, ScoutCall, Restaurant } from "@/lib/types";

export default function MissionPage() {
  const { id } = useParams<{ id: string }>();
  const [mission, setMission] = useState<MissionWithCalls | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const loadMission = useCallback(async () => {
    const res = await fetch(`/api/missions/${id}`);
    if (res.ok) {
      const data = await res.json();
      setMission(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadMission();

    const supabase = createSupabaseBrowser();

    const channel = supabase
      .channel(`mission-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scout_calls",
          filter: `mission_id=eq.${id}`,
        },
        () => {
          loadMission();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "missions",
          filter: `id=eq.${id}`,
        },
        () => {
          loadMission();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadMission]);

  const handleBook = async (callId: string) => {
    setBookingId(callId);
    try {
      const res = await fetch(`/api/calls/${callId}/book`, { method: "POST" });
      if (!res.ok) throw new Error("Booking failed");
      alert("Booking call initiated! Scout is calling to make your reservation.");
    } catch {
      alert("Failed to start booking call. Please try again.");
    } finally {
      setBookingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Mission not found
      </div>
    );
  }

  const completedCount = mission.scout_calls.filter((c) =>
    ["ended", "no_answer", "voicemail", "failed"].includes(c.status)
  ).length;

  const allDone = completedCount === mission.scout_calls.length;
  const allSkip =
    allDone &&
    mission.scout_calls
      .filter((c) => c.status === "ended")
      .every((c) => c.recommendation === "skip");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{mission.neighborhood}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mission.raw_query}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={
            mission.status === "complete"
              ? "bg-green-100 text-green-800"
              : mission.status === "calling"
                ? "bg-yellow-100 text-yellow-800"
                : ""
          }
        >
          {mission.status === "calling"
            ? `Calling (${completedCount}/${mission.scout_calls.length})`
            : mission.status}
        </Badge>
      </div>

      {/* Live call cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mission.scout_calls.map((call) => (
          <LiveCallCard
            key={call.id}
            call={call as ScoutCall}
            restaurant={call.restaurant as Restaurant}
            onBook={handleBook}
            bookingLoading={bookingId === call.id}
          />
        ))}
      </div>

      {/* Comparison table */}
      {completedCount > 0 && (
        <MissionComparison
          calls={mission.scout_calls as (ScoutCall & { restaurant: Restaurant })[]}
          onBook={handleBook}
        />
      )}

      {/* Edge case: all results are skip */}
      {allSkip && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-muted-foreground">
            All results came back as &quot;skip&quot; — try expanding your
            search to a wider area or different time.
          </p>
        </div>
      )}
    </div>
  );
}
