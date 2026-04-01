"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, X, Sparkles, RotateCcw, MapPin, Clock, Users, DollarSign, TreePine, Wine, UtensilsCrossed } from "lucide-react";
import { useTasteProfile, getTopPreferences } from "@/lib/taste-profile";

const PRICE_LABELS: Record<string, string> = { "1": "$", "2": "$$", "3": "$$$", "4": "$$$$" };

function TasteBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-orange-400" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-5 text-right">{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dietaryInput, setDietaryInput] = useState("");
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const { profile, loaded, resetProfile } = useTasteProfile();
  const prefs = getTopPreferences(profile);

  const addRestriction = () => {
    const trimmed = dietaryInput.trim();
    if (trimmed && !restrictions.includes(trimmed)) {
      setRestrictions([...restrictions, trimmed]);
      setDietaryInput("");
    }
  };

  const removeRestriction = (r: string) => {
    setRestrictions(restrictions.filter((x) => x !== r));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const topNeighborhoods = Object.entries(profile.neighborhoods)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const topVibes = Object.entries(profile.vibes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const topCuisines = Object.entries(profile.cuisines)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const maxN = topNeighborhoods[0]?.[1] ?? 1;
  const maxV = topVibes[0]?.[1] ?? 1;
  const maxC = topCuisines[0]?.[1] ?? 1;

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your profile and preferences</p>
          </div>

          {/* Taste Profile */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-500" />
                    Your Taste Profile
                  </CardTitle>
                  <CardDescription>
                    Scout learns your preferences from every mission and booking.
                  </CardDescription>
                </div>
                {profile.total_missions > 0 && (
                  <Button variant="ghost" size="sm" onClick={resetProfile} className="text-muted-foreground gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!loaded || profile.total_missions === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Sparkles className="h-8 w-8 text-orange-200" />
                  <p className="text-sm text-muted-foreground">
                    No data yet. Complete a few missions and Scout will start learning what you like.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-center">
                      <p className="text-2xl font-bold text-orange-600">{profile.total_missions}</p>
                      <p className="text-xs text-muted-foreground">Missions</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-center">
                      <p className="text-2xl font-bold text-green-600">{profile.total_bookings}</p>
                      <p className="text-xs text-muted-foreground">Bookings made</p>
                    </div>
                  </div>

                  {/* Inferred preferences */}
                  {(prefs.neighborhood || prefs.vibe || prefs.time || prefs.cuisine || prefs.priceLevel != null) && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Top preferences</p>
                      <div className="flex flex-wrap gap-2">
                        {prefs.neighborhood && (
                          <Badge variant="outline" className="gap-1.5 bg-orange-50 border-orange-200 text-orange-700">
                            <MapPin className="h-3 w-3" /> {prefs.neighborhood}
                          </Badge>
                        )}
                        {prefs.vibe && (
                          <Badge variant="outline" className="gap-1.5 bg-purple-50 border-purple-200 text-purple-700">
                            <Sparkles className="h-3 w-3" /> {prefs.vibe} vibe
                          </Badge>
                        )}
                        {prefs.time && (
                          <Badge variant="outline" className="gap-1.5 bg-blue-50 border-blue-200 text-blue-700">
                            <Clock className="h-3 w-3" /> {prefs.time}
                          </Badge>
                        )}
                        {prefs.cuisine && (
                          <Badge variant="outline" className="gap-1.5 bg-yellow-50 border-yellow-200 text-yellow-700">
                            <UtensilsCrossed className="h-3 w-3" /> {prefs.cuisine}
                          </Badge>
                        )}
                        {prefs.priceLevel != null && (
                          <Badge variant="outline" className="gap-1.5 bg-gray-50 border-gray-200 text-gray-700">
                            <DollarSign className="h-3 w-3" /> {PRICE_LABELS[String(prefs.priceLevel)] ?? "$".repeat(prefs.priceLevel)}
                          </Badge>
                        )}
                        {prefs.preferOutdoor && (
                          <Badge variant="outline" className="gap-1.5 bg-green-50 border-green-200 text-green-700">
                            <TreePine className="h-3 w-3" /> Outdoor seating
                          </Badge>
                        )}
                        {prefs.preferBar && (
                          <Badge variant="outline" className="gap-1.5 bg-blue-50 border-blue-200 text-blue-700">
                            <Wine className="h-3 w-3" /> Bar seating
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Neighborhood breakdown */}
                  {topNeighborhoods.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Neighborhoods</p>
                      <div className="space-y-1.5">
                        {topNeighborhoods.map(([n, count]) => (
                          <div key={n} className="flex items-center gap-2">
                            <span className="w-32 text-sm truncate">{n}</span>
                            <TasteBar value={count} max={maxN} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vibes breakdown */}
                  {topVibes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Vibes</p>
                      <div className="space-y-1.5">
                        {topVibes.map(([v, count]) => (
                          <div key={v} className="flex items-center gap-2">
                            <span className="w-32 text-sm capitalize truncate">{v}</span>
                            <TasteBar value={count} max={maxV} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cuisines */}
                  {topCuisines.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Cuisines booked</p>
                      <div className="space-y-1.5">
                        {topCuisines.map(([c, count]) => (
                          <div key={c} className="flex items-center gap-2">
                            <span className="w-32 text-sm truncate">{c}</span>
                            <TasteBar value={count} max={maxC} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Party sizes */}
                  {Object.keys(profile.party_sizes).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Typical group size</p>
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(profile.party_sizes)
                          .sort(([, a], [, b]) => b - a)
                          .map(([size, count]) => (
                            <div key={size} className="flex items-center gap-1 rounded-full border bg-muted/50 px-3 py-1 text-xs">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{size}</span>
                              <span className="text-muted-foreground">({count}x)</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your basic account info</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Dietary */}
          <Card>
            <CardHeader>
              <CardTitle>Dietary Restrictions</CardTitle>
              <CardDescription>Scout will ask restaurants about these on every call</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="e.g. vegetarian, nut allergy, gluten-free..."
                  value={dietaryInput}
                  onChange={(e) => setDietaryInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRestriction(); } }}
                  rows={1}
                  className="flex-1"
                />
                <Button variant="outline" onClick={addRestriction}>Add</Button>
              </div>
              {restrictions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {restrictions.map((r) => (
                    <Badge key={r} variant="secondary" className="gap-1 pr-1">
                      {r}
                      <button onClick={() => removeRestriction(r)} className="ml-1 rounded-full p-0.5 hover:bg-muted">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Button onClick={handleSave} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {saved ? "Saved!" : "Save Settings"}
          </Button>
        </div>
      </main>
    </>
  );
}
