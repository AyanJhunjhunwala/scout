"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search } from "lucide-react";
import type { CreateMissionInput } from "@/lib/types";

interface ScoutInputProps {
  onSubmit: (input: CreateMissionInput) => Promise<void>;
  loading?: boolean;
  initialQuery?: string;
}

export function ScoutInput({ onSubmit, loading, initialQuery }: ScoutInputProps) {
  const [neighborhood, setNeighborhood] = useState(initialQuery || "");
  const [partySize, setPartySize] = useState("2");
  const [desiredTime, setDesiredTime] = useState("tonight around 8pm");
  const [vibe, setVibe] = useState("");
  const [dietaryNeeds, setDietaryNeeds] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      neighborhood,
      party_size: parseInt(partySize, 10),
      desired_time: desiredTime,
      vibe: vibe || undefined,
      dietary_needs: dietaryNeeds
        ? dietaryNeeds.split(",").map((s) => s.trim())
        : undefined,
    });
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Search className="h-5 w-5" />
          Where are we going tonight?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="neighborhood" className="text-sm font-medium">
                Neighborhood
              </Label>
              <Input
                id="neighborhood"
                placeholder="Hayes Valley, Mission, North Beach..."
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="h-11 text-base"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="party-size" className="text-sm font-medium">
                Party Size
              </Label>
              <Input
                id="party-size"
                type="number"
                min={1}
                max={20}
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                className="h-11 text-base"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time" className="text-sm font-medium">
              When
            </Label>
            <Input
              id="time"
              placeholder="tonight around 8pm, tomorrow at 7..."
              value={desiredTime}
              onChange={(e) => setDesiredTime(e.target.value)}
              className="h-11 text-base"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vibe" className="text-sm font-medium">
              Vibe (optional)
            </Label>
            <Input
              id="vibe"
              placeholder="chill, lively, romantic, casual..."
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              className="h-11 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dietary" className="text-sm font-medium">
              Dietary Needs (optional)
            </Label>
            <Textarea
              id="dietary"
              placeholder="vegetarian, gluten-free, nut allergy..."
              value={dietaryNeeds}
              onChange={(e) => setDietaryNeeds(e.target.value)}
              rows={2}
              className="text-base"
            />
          </div>

          <Button
            type="submit"
            className="w-full text-base py-6"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Searching restaurants...
              </>
            ) : (
              <>
                <Search className="mr-2 h-5 w-5" />
                Find Restaurants
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
