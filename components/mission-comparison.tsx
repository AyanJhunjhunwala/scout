"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trophy, AlertTriangle, XCircle, Clock, ExternalLink } from "lucide-react";
import type { ScoutCall, Restaurant, Mission } from "@/lib/types";
import { buildOpenTableSearchUrl } from "@/lib/opentable";

interface MissionComparisonProps {
  calls: (ScoutCall & { restaurant: Restaurant })[];
  mission?: Mission;
  onBook?: (callId: string) => void;
}

function VerdictIcon({ rec }: { rec: string | null }) {
  switch (rec) {
    case "best_bet":
      return <Trophy className="h-5 w-5 text-green-600" />;
    case "worth_it":
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    case "skip":
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Clock className="h-5 w-5 text-muted-foreground animate-pulse" />;
  }
}

function verdictLabel(rec: string | null): string {
  switch (rec) {
    case "best_bet":
      return "Best Bet";
    case "worth_it":
      return "Worth It";
    case "skip":
      return "Skip";
    default:
      return "Pending";
  }
}

export function MissionComparison({ calls, mission, onBook }: MissionComparisonProps) {
  const completedCalls = calls.filter((c) =>
    ["ended", "no_answer", "voicemail", "failed"].includes(c.status)
  );
  const totalCalls = calls.length;
  const bestBet = completedCalls.find((c) => c.recommendation === "best_bet");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">
            Results ({completedCalls.length}/{totalCalls} complete)
          </CardTitle>
          {bestBet && (
            <Badge className="gap-1.5 bg-green-100 text-green-800 hover:bg-green-100 text-sm px-3 py-1">
              <Trophy className="h-4 w-4" />
              Top Pick: {bestBet.restaurant.name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Restaurant</th>
                <th className="pb-3 pr-4 font-medium">Wait</th>
                <th className="pb-3 pr-4 font-medium">Vibe</th>
                <th className="pb-3 pr-4 font-medium">Menu Notes</th>
                <th className="pb-3 pr-4 font-medium">Verdict</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call) => {
                const done = [
                  "ended",
                  "no_answer",
                  "voicemail",
                  "failed",
                ].includes(call.status);

                return (
                  <tr key={call.id} className="border-b last:border-0">
                    <td className="py-4 pr-4 text-base font-semibold">
                      {call.restaurant.name}
                    </td>
                    <td className="py-4 pr-4 text-sm">
                      {done ? call.wait_time || "—" : "..."}
                    </td>
                    <td className="py-4 pr-4 text-sm">
                      {done ? call.vibe_report || "—" : "..."}
                    </td>
                    <td className="py-4 pr-4 text-sm max-w-[200px] truncate">
                      {done ? call.menu_notes || "—" : "..."}
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <VerdictIcon
                          rec={done ? call.recommendation : null}
                        />
                        <span className="text-sm font-medium">
                          {done
                            ? verdictLabel(call.recommendation)
                            : "Pending"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      {done &&
                        call.status === "ended" &&
                        call.recommendation !== "skip" && (
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onBook(call.id)}
                              >
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
      </CardContent>
    </Card>
  );
}
