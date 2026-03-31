"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, X } from "lucide-react";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dietaryInput, setDietaryInput] = useState("");
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

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

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your profile and dietary preferences
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your basic account info</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dietary Restrictions</CardTitle>
              <CardDescription>
                Scout will ask restaurants about these on every call
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="e.g. vegetarian, nut allergy, gluten-free..."
                  value={dietaryInput}
                  onChange={(e) => setDietaryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRestriction();
                    }
                  }}
                  rows={1}
                  className="flex-1"
                />
                <Button variant="outline" onClick={addRestriction}>
                  Add
                </Button>
              </div>
              {restrictions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {restrictions.map((r) => (
                    <Badge key={r} variant="secondary" className="gap-1 pr-1">
                      {r}
                      <button
                        onClick={() => removeRestriction(r)}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      >
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
