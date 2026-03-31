"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScoutCall, CallStatus, Restaurant } from "@/lib/types";

interface LiveCallCardProps {
  call: ScoutCall;
  restaurant: Restaurant;
  onBook?: (callId: string) => void;
  bookingLoading?: boolean;
}

const statusConfig: Record<
  CallStatus,
  { label: string; color: string; dot: string }
> = {
  queued: { label: "Queued", color: "bg-gray-100 text-gray-700", dot: "bg-gray-400" },
  ringing: { label: "Ringing...", color: "bg-red-50 text-red-700", dot: "bg-red-500 animate-pulse" },
  connected: { label: "Talking...", color: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-500 animate-pulse" },
  ended: { label: "Done", color: "bg-green-50 text-green-700", dot: "bg-green-500" },
  no_answer: { label: "No Answer", color: "bg-gray-100 text-gray-500", dot: "bg-gray-400" },
  voicemail: { label: "Voicemail", color: "bg-gray-100 text-gray-500", dot: "bg-gray-400" },
  failed: { label: "Failed", color: "bg-red-50 text-red-500", dot: "bg-red-400" },
};

function RecommendationBadge({ rec }: { rec: string | null }) {
  if (!rec) return null;
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    best_bet: { label: "Best Bet", variant: "default" },
    worth_it: { label: "Worth It", variant: "secondary" },
    skip: { label: "Skip", variant: "destructive" },
  };
  const c = config[rec];
  if (!c) return null;
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export function LiveCallCard({
  call,
  restaurant,
  onBook,
  bookingLoading,
}: LiveCallCardProps) {
  const status = statusConfig[call.status] || statusConfig.queued;
  const isDone = ["ended", "no_answer", "voicemail", "failed"].includes(call.status);

  return (
    <Card className={cn("transition-all", !isDone && "animate-in fade-in-0")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">
          {restaurant.name}
        </CardTitle>
        <div className="flex items-center gap-2">
          <span
            className={cn("inline-block h-2.5 w-2.5 rounded-full", status.dot)}
          />
          <Badge variant="outline" className={cn("text-xs", status.color)}>
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isDone && call.status === "connected" && (
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Live transcript</p>
            <p className="mt-1 text-sm leading-relaxed">
              {call.transcript || (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Listening...
                </span>
              )}
            </p>
          </div>
        )}

        {call.status === "ringing" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 animate-pulse" />
            Calling {restaurant.name}...
          </div>
        )}

        {isDone && call.status === "ended" && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {call.wait_time && (
                <div>
                  <span className="text-muted-foreground">Wait: </span>
                  <span className="font-medium">{call.wait_time}</span>
                </div>
              )}
              {call.vibe_report && (
                <div>
                  <span className="text-muted-foreground">Vibe: </span>
                  <span className="font-medium">{call.vibe_report}</span>
                </div>
              )}
              {call.menu_notes && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Menu: </span>
                  <span className="font-medium">{call.menu_notes}</span>
                </div>
              )}
              {call.availability && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Availability: </span>
                  <span className="font-medium">{call.availability}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <RecommendationBadge rec={call.recommendation} />
                {call.recommendation_reason && (
                  <span className="text-xs text-muted-foreground">
                    {call.recommendation_reason}
                  </span>
                )}
              </div>
              {call.recommendation !== "skip" && onBook && (
                <Button
                  size="sm"
                  onClick={() => onBook(call.id)}
                  disabled={bookingLoading}
                >
                  {bookingLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Book"
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {isDone && call.status !== "ended" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PhoneOff className="h-4 w-4" />
            {call.status === "no_answer"
              ? "No one picked up"
              : call.status === "voicemail"
                ? "Reached voicemail"
                : "Call failed"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
