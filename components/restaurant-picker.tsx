"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Restaurant } from "@/lib/types";

interface RestaurantPickerProps {
  restaurants: Restaurant[];
  onLaunch: (restaurantIds: string[]) => Promise<void>;
  loading?: boolean;
}

function priceLabel(level: number | null): string {
  if (!level) return "";
  return "$".repeat(level);
}

export function RestaurantPicker({
  restaurants,
  onLaunch,
  loading,
}: RestaurantPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 5) {
        next.add(id);
      }
      return next;
    });
  };

  const selectTop = () => {
    const sorted = [...restaurants].sort(
      (a, b) => (b.rating || 0) - (a.rating || 0)
    );
    setSelected(new Set(sorted.slice(0, 5).map((r) => r.id)));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-base text-muted-foreground">
          {restaurants.length} restaurants found — select up to 5
        </p>
        <Button variant="outline" size="sm" onClick={selectTop}>
          Auto-pick top 5
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {restaurants.map((restaurant) => (
          <Card
            key={restaurant.id}
            className={cn(
              "cursor-pointer overflow-hidden transition-all hover:shadow-lg",
              selected.has(restaurant.id) && "ring-2 ring-primary shadow-lg"
            )}
            onClick={() => toggle(restaurant.id)}
          >
            {restaurant.photo_ref && (
              <div className="relative h-36 w-full bg-muted">
                <img
                  src={`/api/photos?ref=${restaurant.photo_ref}&w=600`}
                  alt={restaurant.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Checkbox
                    checked={selected.has(restaurant.id)}
                    className="h-5 w-5 border-white bg-white/80 data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            )}
            <CardContent className={cn("p-4", !restaurant.photo_ref && "flex items-start gap-3")}>
              {!restaurant.photo_ref && (
                <Checkbox
                  checked={selected.has(restaurant.id)}
                  className="mt-1"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold truncate">
                    {restaurant.name}
                  </h3>
                  {restaurant.price_level && (
                    <Badge variant="secondary" className="shrink-0">
                      {priceLabel(restaurant.price_level)}
                    </Badge>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-sm text-muted-foreground">
                  {restaurant.rating && (
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {restaurant.rating}
                    </span>
                  )}
                  {restaurant.address && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {restaurant.address}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        size="lg"
        className="w-full text-base py-6"
        disabled={selected.size === 0 || loading}
        onClick={() => onLaunch(Array.from(selected))}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Launching scout calls...
          </>
        ) : (
          `Scout These (${selected.size})`
        )}
      </Button>
    </div>
  );
}
