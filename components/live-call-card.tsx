"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  PhoneOff,
  Loader2,
  ExternalLink,
  Sparkles,
  Volume2,
  Volume1,
  VolumeX,
  Users,
  TreePine,
  Wine,
  DollarSign,
  Tag,
} from "lucide-react";
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
  tasteScore?: number;
}

const statusConfig: Record<CallStatus, { label: string; color: string; dot: string }> = {
  queued:    { label: "Queued",    color: "bg-gray-100 text-gray-700",    dot: "bg-gray-400" },
  ringing:   { label: "Ringing…",  color: "bg-red-50 text-red-700",      dot: "bg-red-500 animate-pulse" },
  connected: { label: "Talking…",  color: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-500 animate-pulse" },
  ended:     { label: "Done",      color: "bg-green-50 text-green-700",   dot: "bg-green-500" },
  no_answer: { label: "No Answer", color: "bg-gray-100 text-gray-500",    dot: "bg-gray-400" },
  voicemail: { label: "Voicemail", color: "bg-gray-100 text-gray-500",    dot: "bg-gray-400" },
  failed:    { label: "Failed",    color: "bg-red-50 text-red-500",       dot: "bg-red-400" },
};

function RecommendationBadge({ rec }: { rec: string | null }) {
  if (!rec) return null;
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    best_bet: { label: "Best Bet", variant: "default" },
    worth_it: { label: "Worth It", variant: "secondary" },
    skip:     { label: "Skip",     variant: "destructive" },
  };
  const c = config[rec];
  if (!c) return null;
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function NoiseIcon({ level }: { level: string }) {
  if (level === "loud") return <Volume2 className="h-3.5 w-3.5" />;
  if (level === "moderate") return <Volume1 className="h-3.5 w-3.5" />;
  return <VolumeX className="h-3.5 w-3.5" />;
}

const crowdColors: Record<string, string> = {
  empty:    "bg-blue-50 text-blue-700 border-blue-200",
  moderate: "bg-yellow-50 text-yellow-700 border-yellow-200",
  busy:     "bg-orange-50 text-orange-700 border-orange-200",
  packed:   "bg-red-50 text-red-700 border-red-200",
};

const noiseColors: Record<string, string> = {
  quiet:    "bg-green-50 text-green-700 border-green-200",
  moderate: "bg-yellow-50 text-yellow-700 border-yellow-200",
  loud:     "bg-red-50 text-red-700 border-red-200",
};

export function LiveCallCard({ call, restaurant, mission, onBook, bookingLoading, tasteScore = 0 }: LiveCallCardProps) {
  const status = statusConfig[call.status] || statusConfig.queued;
  const isDone = ["ended", "no_answer", "voicemail", "failed"].includes(call.status);
  const openTableUrl = mission ? buildOpenTableSearchUrl(restaurant, mission) : null;
  const tasteMatch = tasteScore >= 2;

  return (
    <Card className={cn(
      "overflow-hidden transition-all shadow-sm",
      !isDone && "animate-in fade-in-0",
      tasteMatch && "ring-2 ring-orange-300 ring-offset-1"
    )}>
      {/* Photo header */}
      {restaurant.photo_ref ? (
        <div className="relative h-32 w-full bg-muted">
          <img
            src={`/api/photos?ref=${restaurant.photo_ref}&w=600`}
            alt={restaurant.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white drop-shadow">{restaurant.name}</h3>
              {restaurant.cuisine && (
                <p className="text-xs text-white/70">{restaurant.cuisine}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="outline" className={cn("text-xs border-white/30 backdrop-blur-sm", status.color)}>
                <span className={cn("mr-1.5 inline-block h-2 w-2 rounded-full", status.dot)} />
                {status.label}
              </Badge>
              {tasteMatch && (
                <span className="rounded-full bg-orange-500/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                  Matches your taste
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h3 className="text-lg font-semibold">{restaurant.name}</h3>
            {restaurant.cuisine && <p className="text-xs text-muted-foreground">{restaurant.cuisine}</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className={cn("inline-block h-2.5 w-2.5 rounded-full", status.dot)} />
              <Badge variant="outline" className={cn("text-xs", status.color)}>{status.label}</Badge>
            </div>
            {tasteMatch && (
              <span className="rounded-full bg-orange-100 border border-orange-200 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                Matches your taste
              </span>
            )}
          </div>
        </div>
      )}

      <CardContent className="space-y-3 p-4">
        {/* Active call states */}
        {!isDone && call.status === "connected" && (
          <div className="space-y-2">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Live transcript</p>
              <p className="mt-1.5 text-sm leading-relaxed">
                {call.transcript || (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Listening...
                  </span>
                )}
              </p>
            </div>
            {call.listen_url && <LiveAudioPlayer callId={call.id} isActive />}
          </div>
        )}

        {call.status === "ringing" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 animate-pulse" />
              <span>Calling {restaurant.name}…</span>
            </div>
            {call.listen_url && <LiveAudioPlayer callId={call.id} isActive />}
          </div>
        )}

        {call.status === "queued" && (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Waiting to dial…</span>
          </div>
        )}

        {isDone && call.status === "ended" && !call.recommendation && (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            <span>Analyzing transcript…</span>
          </div>
        )}

        {/* Completed call with results */}
        {isDone && call.status === "ended" && call.recommendation && (
          <div className="space-y-3">
            {/* Summary */}
            {call.call_summary && (
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="h-3 w-3 text-orange-500" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Summary</p>
                </div>
                <p className="text-sm leading-relaxed">{call.call_summary}</p>
              </div>
            )}

            {/* Highlights */}
            {call.highlights && call.highlights.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {call.highlights.map((h, i) => (
                  <span key={i} className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                    {h}
                  </span>
                ))}
              </div>
            )}

            {/* Vibe tags */}
            {call.vibe_tags && call.vibe_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {call.vibe_tags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                    <Tag className="h-2.5 w-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
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
              {call.availability && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Availability</p>
                  <p className="text-sm font-semibold">{call.availability}</p>
                </div>
              )}
              {call.menu_notes && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Menu</p>
                  <p className="text-sm font-semibold">{call.menu_notes}</p>
                </div>
              )}
              {call.price_per_person && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Price</p>
                  <p className="text-sm font-semibold">{call.price_per_person}/person</p>
                </div>
              )}
              {call.special_notes && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</p>
                  <p className="text-sm">{call.special_notes}</p>
                </div>
              )}
            </div>

            {/* Attribute badges */}
            <div className="flex flex-wrap gap-1.5">
              {call.noise_level && (
                <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", noiseColors[call.noise_level])}>
                  <NoiseIcon level={call.noise_level} />
                  {call.noise_level === "quiet" ? "Quiet" : call.noise_level === "moderate" ? "Moderate noise" : "Loud"}
                </span>
              )}
              {call.crowd_level && (
                <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", crowdColors[call.crowd_level])}>
                  <Users className="h-3 w-3" />
                  {call.crowd_level.charAt(0).toUpperCase() + call.crowd_level.slice(1)}
                </span>
              )}
              {call.outdoor_seating === true && (
                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  <TreePine className="h-3 w-3" />
                  Outdoor seating
                </span>
              )}
              {call.bar_seating === true && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  <Wine className="h-3 w-3" />
                  Bar seating
                </span>
              )}
              {restaurant.price_level && (
                <span className="inline-flex items-center gap-0.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  <DollarSign className="h-3 w-3" />
                  {"$".repeat(restaurant.price_level)}
                </span>
              )}
            </div>

            {/* Verdict + actions */}
            <div className="border-t pt-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <RecommendationBadge rec={call.recommendation} />
                {call.recommendation_reason && (
                  <span className="text-xs text-muted-foreground line-clamp-2">{call.recommendation_reason}</span>
                )}
              </div>
              {call.recommendation !== "skip" && (
                <div className="flex items-center gap-2">
                  {openTableUrl && (
                    <a
                      href={openTableUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                    >
                      OpenTable
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {onBook && (
                    <Button size="sm" onClick={() => onBook(call.id)} disabled={bookingLoading}>
                      {bookingLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Phone className="mr-1 h-3 w-3" />
                          Book
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Non-ended done states */}
        {isDone && call.status !== "ended" && (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <PhoneOff className="h-4 w-4" />
            {call.status === "no_answer" ? "No one picked up"
              : call.status === "voicemail" ? "Reached voicemail"
              : "Call failed"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
