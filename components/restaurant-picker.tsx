"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Phone, Star } from "lucide-react";
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
    const top = restaurants
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5)
      .map((r) => r.id);
    setSelected(new Set(top));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {restaurants.length} restaurants found — select up to 5 to scout
        </p>
        <Button variant="outline" size="sm" onClick={selectTop}>
          Auto-pick top 5
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {restaurants.map((restaurant) => (
          <Card
            key={restaurant.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selected.has(restaurant.id) &&
                "ring-2 ring-primary shadow-md"
            )}
            onClick={() => toggle(restaurant.id)}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <Checkbox
                checked={selected.has(restaurant.id)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{restaurant.name}</h3>
                  {restaurant.price_level && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {priceLabel(restaurant.price_level)}
                    </Badge>
                  )}
                </div>
                {restaurant.rating && (
                  <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    {restaurant.rating}
                  </div>
                )}
                {restaurant.address && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground truncate">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {restaurant.address}
                  </p>
                )}
                {restaurant.phone && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" />
                    {restaurant.phone}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        size="lg"
        className="w-full"
        disabled={selected.size === 0 || loading}
        onClick={() => onLaunch(Array.from(selected))}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Launching scout calls...
          </>
        ) : (
          `Scout These (${selected.size})`
        )}
      </Button>
    </div>
  );
}
