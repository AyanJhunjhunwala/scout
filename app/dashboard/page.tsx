"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ArrowRight, Trophy, Clock, Users, MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { createSupabaseBrowser } from "@/lib/supabase";
import { useTasteProfile } from "@/lib/taste-profile";
import type { Mission } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface MissionSummary {
  best_pick_name: string | null;
  call_count: number;
  completed_count: number;
  best_recommendation: string | null;
}

const statusColors: Record<string, string> = {
  pending:  "bg-gray-100 text-gray-700",
  calling:  "bg-yellow-100 text-yellow-800",
  complete: "bg-green-100 text-green-800",
  failed:   "bg-red-100 text-red-700",
};

export default function DashboardPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [summaries, setSummaries] = useState<Record<string, MissionSummary>>({});
  const [loading, setLoading] = useState(true);
  const { profile } = useTasteProfile();

  const topNeighborhood = Object.entries(profile.neighborhoods).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  const topVibe = Object.entries(profile.vibes).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  useEffect(() => {
    const supabase = createSupabaseBrowser();

    async function load() {
      const { data } = await supabase
        .from("missions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      const missionList = (data as Mission[]) || [];
      setMissions(missionList);
      setLoading(false);

      // Load call summaries for complete missions
      const completeMissions = missionList.filter((m) => m.status === "complete");
      if (completeMissions.length > 0) {
        const { data: callRows } = await supabase
          .from("scout_calls")
          .select("mission_id, status, recommendation, restaurant:restaurants(name)")
          .in("mission_id", completeMissions.map((m) => m.id));

        const calls = callRows as Array<{
          mission_id: string;
          status: string;
          recommendation: string | null;
          restaurant: { name: string } | null;
        }> | null;

        if (calls) {
          const byMission: Record<string, MissionSummary> = {};
          for (const call of calls) {
            const mid = call.mission_id;
            if (!byMission[mid]) {
              byMission[mid] = { best_pick_name: null, call_count: 0, completed_count: 0, best_recommendation: null };
            }
            byMission[mid].call_count++;
            if (["ended", "no_answer", "voicemail", "failed"].includes(call.status)) {
              byMission[mid].completed_count++;
            }
            if (call.recommendation === "best_bet" && !byMission[mid].best_pick_name) {
              byMission[mid].best_pick_name = call.restaurant?.name ?? null;
              byMission[mid].best_recommendation = "best_bet";
            } else if (call.recommendation === "worth_it" && !byMission[mid].best_recommendation) {
              byMission[mid].best_recommendation = "worth_it";
            }
          }
          setSummaries(byMission);
        }
      }
    }

    load();
    const interval = setInterval(load, 5000);
    const channel = supabase
      .channel("missions-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "missions" }, () => load())
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Missions</h1>
          <p className="mt-1 text-base text-muted-foreground">
            Your past and active scouting missions
          </p>
        </div>
        <Link href="/dashboard/scout" className={cn(buttonVariants())}>
          <Plus className="mr-2 h-4 w-4" />
          New Scout
        </Link>
      </div>

      {/* Taste profile nudge — shown once there's enough data */}
      {profile.total_missions >= 3 && (topNeighborhood || topVibe) && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-orange-500 shrink-0" />
          <p className="text-sm text-orange-800">
            <span className="font-semibold">Scout knows your taste:</span>{" "}
            {[topVibe && `You love ${topVibe} vibes`, topNeighborhood && `Frequent in ${topNeighborhood}`].filter(Boolean).join(" · ")}
            {" "}— visit <Link href="/settings" className="underline font-medium">Settings</Link> to see your full taste profile.
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : missions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <p className="text-lg text-muted-foreground">No missions yet</p>
            <Link href="/dashboard/scout" className={cn(buttonVariants({ size: "lg" }))}>
              Start your first scout
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {missions.map((mission) => {
            const summary = summaries[mission.id];
            return (
              <Link key={mission.id} href={`/dashboard/mission/${mission.id}`} className="block">
                <Card className="transition-all hover:bg-accent/50 hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-semibold">
                      {mission.neighborhood} — {mission.party_size} people
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn("text-sm", statusColors[mission.status] || "")}
                      >
                        {mission.status}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Meta info row */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {mission.neighborhood}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {mission.party_size} people
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {mission.desired_time}
                      </span>
                      {mission.vibe && (
                        <span className="rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-orange-700 text-[11px] font-medium">
                          {mission.vibe} vibe
                        </span>
                      )}
                    </div>

                    {/* Raw query */}
                    {mission.raw_query && (
                      <p className="text-sm text-muted-foreground mb-2">{mission.raw_query}</p>
                    )}

                    {/* Best pick if complete */}
                    {summary?.best_pick_name && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Trophy className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-sm font-medium text-green-700">
                          Top pick: {summary.best_pick_name}
                        </span>
                        {summary.call_count > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({summary.completed_count}/{summary.call_count} calls)
                          </span>
                        )}
                      </div>
                    )}

                    {/* In-progress calls count */}
                    {mission.status === "calling" && summary?.call_count && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {summary.completed_count} of {summary.call_count} calls finished
                      </p>
                    )}

                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(mission.created_at), { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
