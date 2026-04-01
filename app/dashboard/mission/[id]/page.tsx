"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveCallCard } from "@/components/live-call-card";
import { MissionComparison } from "@/components/mission-comparison";
import { createSupabaseBrowser } from "@/lib/supabase";
import { useTasteProfile, scoreCallForTaste } from "@/lib/taste-profile";
import type { MissionWithCalls, ScoutCall, Restaurant } from "@/lib/types";
import {
  Trophy,
  Clock,
  Users,
  MapPin,
  TreePine,
  Wine,
  TrendingUp,
} from "lucide-react";

function MissionSummaryPanel({ mission }: { mission: MissionWithCalls }) {
  const endedCalls = mission.scout_calls.filter((c) => c.status === "ended" && c.recommendation);
  if (endedCalls.length === 0) return null;

  const bestBet = endedCalls.find((c) => c.recommendation === "best_bet");
  const withWait = endedCalls.filter((c) => c.wait_time && c.wait_time !== "no wait");
  const noWait = endedCalls.filter((c) => c.wait_time === "no wait");
  const withAvailability = endedCalls.filter((c) => c.availability && !c.availability.toLowerCase().includes("fully"));
  const outdoorAvail = endedCalls.filter((c) => c.outdoor_seating);
  const barAvail = endedCalls.filter((c) => c.bar_seating);
  const skipCount = endedCalls.filter((c) => c.recommendation === "skip").length;

  const stats = [
    bestBet && {
      icon: Trophy,
      label: "Top pick",
      value: (bestBet.restaurant as Restaurant).name,
      color: "text-green-700",
      bg: "bg-green-50 border-green-200",
    },
    {
      icon: Clock,
      label: "No wait available",
      value: noWait.length > 0 ? `${noWait.length} place${noWait.length > 1 ? "s" : ""}` : withWait.length > 0 ? `${withWait.length} have a wait` : "Unknown",
      color: noWait.length > 0 ? "text-blue-700" : "text-muted-foreground",
      bg: "bg-blue-50 border-blue-200",
    },
    withAvailability.length > 0 && {
      icon: Users,
      label: "Open for you",
      value: `${withAvailability.length} of ${endedCalls.length}`,
      color: "text-purple-700",
      bg: "bg-purple-50 border-purple-200",
    },
    outdoorAvail.length > 0 && {
      icon: TreePine,
      label: "Outdoor seating",
      value: `${outdoorAvail.length} option${outdoorAvail.length > 1 ? "s" : ""}`,
      color: "text-green-700",
      bg: "bg-green-50 border-green-200",
    },
    barAvail.length > 0 && {
      icon: Wine,
      label: "Bar seating",
      value: `${barAvail.length} option${barAvail.length > 1 ? "s" : ""}`,
      color: "text-blue-700",
      bg: "bg-blue-50 border-blue-200",
    },
    skipCount > 0 && {
      icon: TrendingUp,
      label: "Skip",
      value: `${skipCount} recommended skip`,
      color: "text-red-600",
      bg: "bg-red-50 border-red-200",
    },
  ].filter(Boolean) as { icon: typeof Trophy; label: string; value: string; color: string; bg: string }[];

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-orange-500" />
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Scout Summary</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {stats.map((s, i) => (
          <div key={i} className={`rounded-lg border px-3 py-2.5 ${s.bg}`}>
            <div className={`flex items-center gap-1.5 mb-0.5 ${s.color}`}>
              <s.icon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium uppercase tracking-wide">{s.label}</span>
            </div>
            <p className={`text-sm font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MissionPage() {
  const { id } = useParams<{ id: string }>();
  const [mission, setMission] = useState<MissionWithCalls | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const syncRef = useRef<NodeJS.Timeout | null>(null);
  const { profile, recordBooking } = useTasteProfile();

  const loadMission = useCallback(async () => {
    try {
      const res = await fetch(`/api/missions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMission(data);

        const activeCalls = data.scout_calls?.filter(
          (c: ScoutCall) => ["queued", "ringing", "connected"].includes(c.status)
        );
        const callsNeedingExtraction = data.scout_calls?.filter(
          (c: ScoutCall) => c.status === "ended" && !c.recommendation
        );
        const fullyDone =
          (!activeCalls || activeCalls.length === 0) &&
          (!callsNeedingExtraction || callsNeedingExtraction.length === 0);

        if (fullyDone) {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          if (syncRef.current) { clearInterval(syncRef.current); syncRef.current = null; }
        }
        if (callsNeedingExtraction && callsNeedingExtraction.length > 0) {
          fetch(`/api/missions/${id}/sync`, { method: "POST" }).catch(() => {});
        }
      }
    } catch (err) {
      console.error("Failed to load mission:", err);
    }
    setLoading(false);
  }, [id]);

  const syncCalls = useCallback(async () => {
    try {
      await fetch(`/api/missions/${id}/sync`, { method: "POST" });
      loadMission();
    } catch {}
  }, [id, loadMission]);

  useEffect(() => {
    loadMission();
    pollRef.current = setInterval(loadMission, 3000);
    syncRef.current = setInterval(syncCalls, 10000);

    const supabase = createSupabaseBrowser();
    const channel = supabase
      .channel(`mission-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "scout_calls", filter: `mission_id=eq.${id}` }, () => loadMission())
      .on("postgres_changes", { event: "*", schema: "public", table: "missions", filter: `id=eq.${id}` }, () => loadMission())
      .subscribe();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (syncRef.current) clearInterval(syncRef.current);
      supabase.removeChannel(channel);
    };
  }, [id, loadMission, syncCalls]);

  const handleBook = async (callId: string) => {
    setBookingId(callId);
    try {
      const res = await fetch(`/api/calls/${callId}/book`, { method: "POST" });
      if (!res.ok) throw new Error("Booking failed");

      // Record booking signal for taste profile
      const bookedCall = mission?.scout_calls.find((c) => c.id === callId);
      if (bookedCall && bookedCall.restaurant) {
        recordBooking(bookedCall as ScoutCall, bookedCall.restaurant as Restaurant);
      }

      alert("Booking call initiated! Scout is calling to make your reservation.");
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
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!mission) {
    return <div className="py-16 text-center text-lg text-muted-foreground">Mission not found</div>;
  }

  const completedCount = mission.scout_calls.filter((c) =>
    ["ended", "no_answer", "voicemail", "failed"].includes(c.status)
  ).length;
  const allDone = completedCount === mission.scout_calls.length;
  const allSkip =
    allDone &&
    mission.scout_calls.filter((c) => c.status === "ended").every((c) => c.recommendation === "skip");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <MapPin className="h-3.5 w-3.5" />
            <span>{mission.neighborhood}</span>
            <span>·</span>
            <Users className="h-3.5 w-3.5" />
            <span>{mission.party_size} people</span>
            <span>·</span>
            <Clock className="h-3.5 w-3.5" />
            <span>{mission.desired_time}</span>
            {mission.vibe && <><span>·</span><span>{mission.vibe} vibe</span></>}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{mission.neighborhood}</h1>
          {mission.raw_query && (
            <p className="mt-1 text-base text-muted-foreground">{mission.raw_query}</p>
          )}
        </div>
        <Badge
          variant="secondary"
          className={
            mission.status === "complete" ? "bg-green-100 text-green-800 text-sm px-3 py-1"
            : mission.status === "calling" ? "bg-yellow-100 text-yellow-800 text-sm px-3 py-1"
            : "text-sm px-3 py-1"
          }
        >
          {mission.status === "calling"
            ? `Calling (${completedCount}/${mission.scout_calls.length})`
            : mission.status}
        </Badge>
      </div>

      {/* Summary panel — shown once results start coming in */}
      {completedCount > 0 && <MissionSummaryPanel mission={mission} />}

      {/* Call cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {mission.scout_calls.map((call) => (
          <LiveCallCard
            key={call.id}
            call={call as ScoutCall}
            restaurant={call.restaurant as Restaurant}
            mission={mission}
            onBook={handleBook}
            bookingLoading={bookingId === call.id}
            tasteScore={scoreCallForTaste(call as ScoutCall, call.restaurant as Restaurant, profile)}
          />
        ))}
      </div>

      {/* Comparison table */}
      {completedCount > 0 && (
        <MissionComparison
          calls={mission.scout_calls as (ScoutCall & { restaurant: Restaurant })[]}
          mission={mission}
          onBook={handleBook}
          tasteProfile={profile}
        />
      )}

      {allSkip && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-lg text-muted-foreground">
            All results came back as &quot;skip&quot; — try expanding your search to a wider area or different time.
          </p>
        </div>
      )}
    </div>
  );
}
