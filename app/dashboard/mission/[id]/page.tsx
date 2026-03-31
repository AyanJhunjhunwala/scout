"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const loadMission = useCallback(async () => {
    try {
      const res = await fetch(`/api/missions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMission(data);

        const allDone = data.scout_calls?.every(
          (c: ScoutCall) =>
            ["ended", "no_answer", "voicemail", "failed"].includes(c.status)
        );
        if (allDone && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch (err) {
      console.error("Failed to load mission:", err);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadMission();

    // Polling fallback — every 3 seconds while calls are active
    pollRef.current = setInterval(loadMission, 3000);

    // Also try Supabase Realtime
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
        () => loadMission()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "missions",
          filter: `id=eq.${id}`,
        },
        () => loadMission()
      )
      .subscribe();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      supabase.removeChannel(channel);
    };
  }, [id, loadMission]);

  const handleBook = async (callId: string) => {
    setBookingId(callId);
    try {
      const res = await fetch(`/api/calls/${callId}/book`, { method: "POST" });
      if (!res.ok) throw new Error("Booking failed");
      alert(
        "Booking call initiated! Scout is calling to make your reservation."
      );
    } catch {
      alert("Failed to start booking call. Please try again.");
    } finally {
      setBookingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="py-16 text-center text-lg text-muted-foreground">
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
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {mission.neighborhood}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {mission.raw_query}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={
            mission.status === "complete"
              ? "bg-green-100 text-green-800 text-sm px-3 py-1"
              : mission.status === "calling"
                ? "bg-yellow-100 text-yellow-800 text-sm px-3 py-1"
                : "text-sm px-3 py-1"
          }
        >
          {mission.status === "calling"
            ? `Calling (${completedCount}/${mission.scout_calls.length})`
            : mission.status}
        </Badge>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

      {completedCount > 0 && (
        <MissionComparison
          calls={
            mission.scout_calls as (ScoutCall & { restaurant: Restaurant })[]
          }
          onBook={handleBook}
        />
      )}

      {allSkip && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-lg text-muted-foreground">
            All results came back as &quot;skip&quot; — try expanding your
            search to a wider area or different time.
          </p>
        </div>
      )}
    </div>
  );
}
