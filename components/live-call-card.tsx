"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveAudioPlayer } from "@/components/live-audio-player";
import type { ScoutCall, CallStatus, Restaurant, Mission } from "@/lib/types";
import { buildOpenTableSearchUrl } from "@/lib/opentable";

interface LiveCallCardProps {
  call: ScoutCall;
  restaurant: Restaurant;
  mission?: Mission;
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
  const config: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" }
  > = {
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
  mission,
  onBook,
  bookingLoading,
}: LiveCallCardProps) {
  const status = statusConfig[call.status] || statusConfig.queued;
  const isDone = ["ended", "no_answer", "voicemail", "failed"].includes(
    call.status
  );
  const openTableUrl = mission
    ? buildOpenTableSearchUrl(restaurant, mission)
    : null;

  return (
    <Card className={cn("overflow-hidden transition-all", !isDone && "animate-in fade-in-0")}>
      {restaurant.photo_ref && (
        <div className="relative h-32 w-full bg-muted">
          <img
            src={`/api/photos?ref=${restaurant.photo_ref}&w=600`}
            alt={restaurant.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
            <h3 className="text-lg font-semibold text-white drop-shadow">
              {restaurant.name}
            </h3>
            <Badge variant="outline" className={cn("text-xs border-white/30 backdrop-blur-sm", status.color)}>
              <span className={cn("mr-1.5 inline-block h-2 w-2 rounded-full", status.dot)} />
              {status.label}
            </Badge>
          </div>
        </div>
      )}

      {!restaurant.photo_ref && (
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="text-lg font-semibold">{restaurant.name}</h3>
          <div className="flex items-center gap-2">
            <span className={cn("inline-block h-2.5 w-2.5 rounded-full", status.dot)} />
            <Badge variant="outline" className={cn("text-xs", status.color)}>
              {status.label}
            </Badge>
          </div>
        </div>
      )}

      <CardContent className="space-y-3 p-4">
        {!isDone && call.status === "connected" && (
          <div className="space-y-2">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Live transcript
              </p>
              <p className="mt-1.5 text-sm leading-relaxed">
                {call.transcript || (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Listening...
                  </span>
                )}
              </p>
            </div>
            {call.listen_url && (
              <LiveAudioPlayer callId={call.id} isActive />
            )}
          </div>
        )}

        {call.status === "ringing" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 animate-pulse" />
              <span>Calling {restaurant.name}...</span>
            </div>
            {call.listen_url && (
              <LiveAudioPlayer callId={call.id} isActive />
            )}
          </div>
        )}

        {call.status === "queued" && (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Waiting to dial...</span>
          </div>
        )}

        {isDone && call.status === "ended" && !call.recommendation && (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            <span>Analyzing transcript...</span>
          </div>
        )}

        {isDone && call.status === "ended" && call.recommendation && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {call.wait_time && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Wait</p>
                  <p className="text-sm font-semibold">{call.wait_time}</p>
                </div>
              )}
              {call.vibe_report && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vibe</p>
                  <p className="text-sm font-semibold">{call.vibe_report}</p>
                </div>
              )}
              {call.menu_notes && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Menu</p>
                  <p className="text-sm font-semibold">{call.menu_notes}</p>
                </div>
              )}
              {call.availability && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Availability</p>
                  <p className="text-sm font-semibold">{call.availability}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-2">
                <RecommendationBadge rec={call.recommendation} />
                {call.recommendation_reason && (
                  <span className="text-xs text-muted-foreground">
                    {call.recommendation_reason}
                  </span>
                )}
              </div>
              {call.recommendation !== "skip" && (
                <div className="flex items-center gap-1.5">
                  {openTableUrl && (
                    <a
                      href={openTableUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                    >
                      OpenTable
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {onBook && (
                    <Button
                      size="sm"
                      onClick={() => onBook(call.id)}
                      disabled={bookingLoading}
                    >
                      {bookingLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Phone className="mr-1 h-3 w-3" />
                          Call to book
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {isDone && call.status !== "ended" && (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
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
