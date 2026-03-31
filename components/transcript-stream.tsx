"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface TranscriptStreamProps {
  transcript: string | null;
  restaurantName: string;
  isLive: boolean;
}

export function TranscriptStream({
  transcript,
  restaurantName,
  isLive,
}: TranscriptStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{restaurantName}</CardTitle>
        {isLive && (
          <Badge variant="outline" className="gap-1 text-xs">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            Live
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div
          ref={scrollRef}
          className="max-h-48 overflow-y-auto rounded-md bg-muted/50 p-3"
        >
          {transcript ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {transcript}
            </p>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Waiting for call to connect...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
