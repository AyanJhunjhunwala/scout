"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { createSupabaseBrowser } from "@/lib/supabase";
import type { Mission } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  calling: "bg-yellow-100 text-yellow-800",
  complete: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-700",
};

export default function DashboardPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowser();

    async function load() {
      const { data } = await supabase
        .from("missions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      setMissions(data || []);
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel("missions-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "missions" },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Missions</h1>
          <p className="text-sm text-muted-foreground">
            Your past and active scouting missions
          </p>
        </div>
        <Link
          href="/dashboard/scout"
          className={cn(buttonVariants())}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Scout
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : missions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-muted-foreground">No missions yet</p>
            <Link
              href="/dashboard/scout"
              className={cn(buttonVariants())}
            >
              Start your first scout
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {missions.map((mission) => (
            <Link
              key={mission.id}
              href={`/dashboard/mission/${mission.id}`}
              className="block"
            >
              <Card className="transition-colors hover:bg-accent/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">
                    {mission.neighborhood} — {mission.party_size} people
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={statusColors[mission.status] || ""}
                    >
                      {mission.status}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {mission.raw_query}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(mission.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
