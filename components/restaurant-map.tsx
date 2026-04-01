"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import { Star, Phone, MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MapRestaurant {
  place_id: string;
  name: string;
  vicinity: string;
  rating: number | null;
  price_level: number | null;
  lat: number;
  lng: number;
  photo_ref: string | null;
  open_now: boolean | null;
  user_ratings_total: number;
}

interface RestaurantMapProps {
  onScout: (restaurant: MapRestaurant) => void;
}

const SF_CENTER = { lat: 37.7749, lng: -122.4194 };

function MapContent({ onScout }: RestaurantMapProps) {
  const map = useMap();
  const [restaurants, setRestaurants] = useState<MapRestaurant[]>([]);
  const [selected, setSelected] = useState<MapRestaurant | null>(null);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchRef = useRef("");

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        map?.panTo(loc);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, [map]);

  const fetchRestaurants = useCallback(async () => {
    if (!map) return;
    const center = map.getCenter();
    if (!center) return;

    const lat = center.lat().toFixed(4);
    const lng = center.lng().toFixed(4);
    const key = `${lat},${lng}`;
    if (key === lastFetchRef.current) return;
    lastFetchRef.current = key;

    setLoading(true);
    try {
      const zoom = map.getZoom() || 14;
      const radius = Math.min(5000, Math.max(500, Math.round(40000 / Math.pow(2, zoom / 3))));
      const res = await fetch(`/api/restaurants/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
      const data = await res.json();
      if (data.results) setRestaurants(data.results);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [map]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const handleIdle = useCallback(() => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    fetchTimeoutRef.current = setTimeout(fetchRestaurants, 400);
  }, [fetchRestaurants]);

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("idle", handleIdle);
    return () => listener.remove();
  }, [map, handleIdle]);

  const priceLabel = (level: number | null) =>
    level ? "$".repeat(level) : "";

  return (
    <>
      {userLocation && (
        <AdvancedMarker position={userLocation}>
          <div className="relative flex items-center justify-center">
            <span className="absolute h-8 w-8 animate-ping rounded-full bg-blue-400 opacity-30" />
            <span className="relative h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg" />
          </div>
        </AdvancedMarker>
      )}

      {restaurants.map((r) => (
        <AdvancedMarker
          key={r.place_id}
          position={{ lat: r.lat, lng: r.lng }}
          onClick={() => setSelected(r)}
        >
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-lg transition-all cursor-pointer",
              "border border-white/50 backdrop-blur-sm",
              selected?.place_id === r.place_id
                ? "bg-orange-500 text-white scale-110"
                : r.open_now === false
                  ? "bg-gray-100 text-gray-500"
                  : "bg-white text-gray-900 hover:bg-orange-50 hover:scale-105"
            )}
          >
            {r.rating && (
              <>
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>{r.rating}</span>
              </>
            )}
            {!r.rating && <MapPin className="h-3 w-3" />}
          </div>
        </AdvancedMarker>
      ))}

      {selected && (
        <InfoWindow
          position={{ lat: selected.lat, lng: selected.lng }}
          onCloseClick={() => setSelected(null)}
          pixelOffset={[0, -35]}
        >
          <div className="min-w-[220px] max-w-[280px] p-1">
            {selected.photo_ref && (
              <img
                src={`/api/photos?ref=${selected.photo_ref}&w=280`}
                alt={selected.name}
                className="mb-2 h-28 w-full rounded-lg object-cover"
              />
            )}
            <h3 className="text-sm font-bold text-gray-900 leading-tight">
              {selected.name}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 leading-snug">
              {selected.vicinity}
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-600">
              {selected.rating && (
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {selected.rating}
                  {selected.user_ratings_total > 0 && (
                    <span className="text-gray-400">
                      ({selected.user_ratings_total})
                    </span>
                  )}
                </span>
              )}
              {selected.price_level && (
                <span className="font-medium text-green-700">
                  {priceLabel(selected.price_level)}
                </span>
              )}
              {selected.open_now !== null && (
                <span
                  className={cn(
                    "font-medium",
                    selected.open_now ? "text-green-600" : "text-red-500"
                  )}
                >
                  {selected.open_now ? "Open" : "Closed"}
                </span>
              )}
            </div>
            <Button
              size="sm"
              className="mt-3 w-full gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => {
                onScout(selected);
                setSelected(null);
              }}
            >
              <Phone className="h-3.5 w-3.5" />
              Scout this spot
            </Button>
          </div>
        </InfoWindow>
      )}

      {loading && (
        <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2">
          <div className="flex items-center gap-1.5 rounded-full border bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-600 shadow-lg backdrop-blur-sm">
            <Loader2 className="h-3 w-3 animate-spin" />
            Searching area...
          </div>
        </div>
      )}
    </>
  );
}

export function RestaurantMap({ onScout }: RestaurantMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";

  return (
    <APIProvider apiKey={apiKey}>
      <div className="relative h-full w-full overflow-hidden rounded-xl border shadow-sm">
        <Map
          defaultCenter={SF_CENTER}
          defaultZoom={14}
          mapId="scout-restaurant-map"
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
          className="h-full w-full"
        >
          <MapContent onScout={onScout} />
        </Map>

        <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10">
          <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[11px] text-white/80 backdrop-blur-sm">
            <Navigation className="h-3 w-3" />
            Pan &amp; zoom to explore · tap a pin to scout
          </div>
        </div>
      </div>
    </APIProvider>
  );
}
