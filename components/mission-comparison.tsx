"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trophy, AlertTriangle, XCircle, Clock } from "lucide-react";
import type { ScoutCall, Restaurant } from "@/lib/types";

interface MissionComparisonProps {
  calls: (ScoutCall & { restaurant: Restaurant })[];
  onBook?: (callId: string) => void;
}

function VerdictIcon({ rec }: { rec: string | null }) {
  switch (rec) {
    case "best_bet":
      return <Trophy className="h-4 w-4 text-green-600" />;
    case "worth_it":
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case "skip":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
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

export function MissionComparison({ calls, onBook }: MissionComparisonProps) {
  const completedCalls = calls.filter((c) =>
    ["ended", "no_answer", "voicemail", "failed"].includes(c.status)
  );
  const totalCalls = calls.length;
  const bestBet = completedCalls.find((c) => c.recommendation === "best_bet");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Results ({completedCalls.length}/{totalCalls} complete)
          </CardTitle>
          {bestBet && (
            <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
              <Trophy className="h-3 w-3" />
              Top Pick: {bestBet.restaurant.name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Restaurant</th>
                <th className="pb-2 pr-4 font-medium">Wait</th>
                <th className="pb-2 pr-4 font-medium">Vibe</th>
                <th className="pb-2 pr-4 font-medium">Menu Notes</th>
                <th className="pb-2 pr-4 font-medium">Verdict</th>
                <th className="pb-2 font-medium"></th>
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
                    <td className="py-3 pr-4 font-medium">
                      {call.restaurant.name}
                    </td>
                    <td className="py-3 pr-4">
                      {done ? call.wait_time || "—" : "..."}
                    </td>
                    <td className="py-3 pr-4">
                      {done ? call.vibe_report || "—" : "..."}
                    </td>
                    <td className="py-3 pr-4 max-w-[200px] truncate">
                      {done ? call.menu_notes || "—" : "..."}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1.5">
                        <VerdictIcon rec={done ? call.recommendation : null} />
                        <span>{done ? verdictLabel(call.recommendation) : "Pending"}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      {done &&
                        call.status === "ended" &&
                        call.recommendation !== "skip" &&
                        onBook && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onBook(call.id)}
                          >
                            Book
                          </Button>
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
