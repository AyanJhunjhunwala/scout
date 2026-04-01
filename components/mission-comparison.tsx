"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trophy,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  TreePine,
  Wine,
  Volume2,
  Volume1,
  VolumeX,
  Users,
  ArrowUpDown,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScoutCall, Restaurant, Mission, TasteProfile } from "@/lib/types";
import { buildOpenTableSearchUrl } from "@/lib/opentable";
import { scoreCallForTaste, tasteMatchLabel } from "@/lib/taste-profile";

interface MissionComparisonProps {
  calls: (ScoutCall & { restaurant: Restaurant })[];
  mission?: Mission;
  onBook?: (callId: string) => void;
  tasteProfile?: TasteProfile;
}

type SortKey = "verdict" | "wait" | "noise" | "crowd" | "taste";
type SortDir = "asc" | "desc";

function VerdictIcon({ rec }: { rec: string | null }) {
  switch (rec) {
    case "best_bet": return <Trophy className="h-4 w-4 text-green-600" />;
    case "worth_it": return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case "skip":     return <XCircle className="h-4 w-4 text-red-500" />;
    default:         return <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />;
  }
}

function verdictRank(rec: string | null): number {
  if (rec === "best_bet") return 0;
  if (rec === "worth_it") return 1;
  if (rec === "skip") return 2;
  return 3;
}

function waitMinutes(wait: string | null): number {
  if (!wait) return 999;
  if (wait === "no wait") return 0;
  const m = wait.match(/(\d+)/);
  return m ? parseInt(m[1]) : 30;
}

function noiseRank(level: string | null): number {
  if (level === "quiet") return 0;
  if (level === "moderate") return 1;
  if (level === "loud") return 2;
  return 3;
}

function crowdRank(level: string | null): number {
  if (level === "empty") return 0;
  if (level === "moderate") return 1;
  if (level === "busy") return 2;
  if (level === "packed") return 3;
  return 4;
}

const noiseColors: Record<string, string> = {
  quiet:    "text-green-700",
  moderate: "text-yellow-700",
  loud:     "text-red-600",
};

const crowdColors: Record<string, string> = {
  empty:    "text-blue-600",
  moderate: "text-yellow-600",
  busy:     "text-orange-600",
  packed:   "text-red-600",
};

function NoiseIcon({ level }: { level: string }) {
  if (level === "loud") return <Volume2 className="h-3.5 w-3.5" />;
  if (level === "moderate") return <Volume1 className="h-3.5 w-3.5" />;
  return <VolumeX className="h-3.5 w-3.5" />;
}

export function MissionComparison({ calls, mission, onBook, tasteProfile }: MissionComparisonProps) {
  const [sortKey, setSortKey] = useState<SortKey>("verdict");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const completedCalls = calls.filter((c) =>
    ["ended", "no_answer", "voicemail", "failed"].includes(c.status)
  );
  const totalCalls = calls.length;
  const bestBet = completedCalls.find((c) => c.recommendation === "best_bet");
  const hasTasteData = tasteProfile && tasteProfile.total_missions >= 2;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortedCalls = [...calls].sort((a, b) => {
    const done_a = ["ended", "no_answer", "voicemail", "failed"].includes(a.status);
    const done_b = ["ended", "no_answer", "voicemail", "failed"].includes(b.status);
    // Always put pending calls at the bottom
    if (!done_a && done_b) return 1;
    if (done_a && !done_b) return -1;

    let cmp = 0;
    if (sortKey === "verdict") cmp = verdictRank(a.recommendation) - verdictRank(b.recommendation);
    else if (sortKey === "wait") cmp = waitMinutes(a.wait_time) - waitMinutes(b.wait_time);
    else if (sortKey === "noise") cmp = noiseRank(a.noise_level) - noiseRank(b.noise_level);
    else if (sortKey === "crowd") cmp = crowdRank(a.crowd_level) - crowdRank(b.crowd_level);
    else if (sortKey === "taste" && tasteProfile) {
      const sa = scoreCallForTaste(a, a.restaurant, tasteProfile);
      const sb = scoreCallForTaste(b, b.restaurant, tasteProfile);
      cmp = sb - sa; // higher score first
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  function SortBtn({ k, label }: { k: SortKey; label: string }) {
    const active = sortKey === k;
    return (
      <button
        onClick={() => handleSort(k)}
        className={cn(
          "flex items-center gap-1 text-left font-medium text-sm transition-colors",
          active ? "text-orange-600" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {label}
        <ArrowUpDown className={cn("h-3 w-3", active ? "opacity-100" : "opacity-40")} />
      </button>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-xl">
            Results ({completedCalls.length}/{totalCalls} complete)
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {bestBet && (
              <Badge className="gap-1.5 bg-green-100 text-green-800 hover:bg-green-100 text-sm px-3 py-1">
                <Trophy className="h-4 w-4" />
                Top Pick: {bestBet.restaurant.name}
              </Badge>
            )}
            {hasTasteData && (
              <Badge className="gap-1.5 bg-orange-50 text-orange-700 border border-orange-200 text-xs px-2.5 py-1">
                <Sparkles className="h-3 w-3" />
                Taste matching on
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 pr-4 font-medium text-muted-foreground">Restaurant</th>
                <th className="pb-3 pr-4"><SortBtn k="verdict" label="Verdict" /></th>
                <th className="pb-3 pr-4"><SortBtn k="wait" label="Wait" /></th>
                <th className="pb-3 pr-4 font-medium text-muted-foreground">Vibe</th>
                <th className="pb-3 pr-4"><SortBtn k="noise" label="Noise" /></th>
                <th className="pb-3 pr-4"><SortBtn k="crowd" label="Crowd" /></th>
                <th className="pb-3 pr-4 font-medium text-muted-foreground">Perks</th>
                <th className="pb-3 pr-4 font-medium text-muted-foreground">Availability</th>
                {hasTasteData && <th className="pb-3 pr-4"><SortBtn k="taste" label="For You" /></th>}
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {sortedCalls.map((call) => {
                const done = ["ended", "no_answer", "voicemail", "failed"].includes(call.status);
                const tasteScore = tasteProfile ? scoreCallForTaste(call, call.restaurant, tasteProfile) : 0;
                const matchLabel = tasteMatchLabel(tasteScore);
                const isBest = call.recommendation === "best_bet";

                return (
                  <tr
                    key={call.id}
                    className={cn(
                      "border-b last:border-0 transition-colors",
                      isBest && "bg-green-50/50",
                      matchLabel && !isBest && "bg-orange-50/30"
                    )}
                  >
                    <td className="py-3.5 pr-4">
                      <div>
                        <p className="font-semibold">{call.restaurant.name}</p>
                        {call.restaurant.cuisine && (
                          <p className="text-xs text-muted-foreground">{call.restaurant.cuisine}</p>
                        )}
                        {call.price_per_person && (
                          <p className="text-xs text-muted-foreground">{call.price_per_person}/person</p>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-1.5">
                        <VerdictIcon rec={done ? call.recommendation : null} />
                        <span className="font-medium">
                          {done ? (call.recommendation === "best_bet" ? "Best Bet"
                            : call.recommendation === "worth_it" ? "Worth It"
                            : call.recommendation === "skip" ? "Skip"
                            : call.status === "no_answer" ? "No Answer"
                            : call.status === "voicemail" ? "Voicemail"
                            : "—") : "Pending"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 pr-4">
                      {done ? call.wait_time || "—" : "…"}
                    </td>

                    <td className="py-3.5 pr-4 max-w-[120px]">
                      <span className="line-clamp-1">{done ? call.vibe_report || "—" : "…"}</span>
                    </td>

                    <td className="py-3.5 pr-4">
                      {done && call.noise_level ? (
                        <span className={cn("flex items-center gap-1 font-medium", noiseColors[call.noise_level])}>
                          <NoiseIcon level={call.noise_level} />
                          {call.noise_level.charAt(0).toUpperCase() + call.noise_level.slice(1)}
                        </span>
                      ) : done ? "—" : "…"}
                    </td>

                    <td className="py-3.5 pr-4">
                      {done && call.crowd_level ? (
                        <span className={cn("font-medium", crowdColors[call.crowd_level])}>
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {call.crowd_level.charAt(0).toUpperCase() + call.crowd_level.slice(1)}
                          </span>
                        </span>
                      ) : done ? "—" : "…"}
                    </td>

                    <td className="py-3.5 pr-4">
                      {done ? (
                        <div className="flex gap-1.5">
                          {call.outdoor_seating === true && (
                            <span title="Outdoor seating"><TreePine className="h-4 w-4 text-green-600" /></span>
                          )}
                          {call.bar_seating === true && (
                            <span title="Bar seating"><Wine className="h-4 w-4 text-blue-600" /></span>
                          )}
                          {!call.outdoor_seating && !call.bar_seating && "—"}
                        </div>
                      ) : "…"}
                    </td>

                    <td className="py-3.5 pr-4 max-w-[150px]">
                      <span className="line-clamp-2 text-xs">{done ? call.availability || "—" : "…"}</span>
                    </td>

                    {hasTasteData && (
                      <td className="py-3.5 pr-4">
                        {done && matchLabel ? (
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                            tasteScore >= 4 ? "bg-orange-100 text-orange-800 border border-orange-200"
                              : "bg-orange-50 text-orange-600 border border-orange-100"
                          )}>
                            <Sparkles className="h-2.5 w-2.5" />
                            {matchLabel}
                          </span>
                        ) : done ? <span className="text-muted-foreground text-xs">—</span> : "…"}
                      </td>
                    )}

                    <td className="py-3.5">
                      {done && call.status === "ended" && call.recommendation !== "skip" && (
                        <div className="flex items-center gap-1.5">
                          {mission && (
                            <a
                              href={buildOpenTableSearchUrl(call.restaurant, mission)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                            >
                              OpenTable
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {onBook && (
                            <Button size="sm" variant="outline" onClick={() => onBook(call.id)}>
                              Call
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend for perks column */}
        <div className="mt-3 flex items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><TreePine className="h-3.5 w-3.5 text-green-600" /> Outdoor seating</span>
          <span className="flex items-center gap-1"><Wine className="h-3.5 w-3.5 text-blue-600" /> Bar seating</span>
        </div>
      </CardContent>
    </Card>
  );
}
