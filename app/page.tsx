"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Phone, Zap, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Chill dinner in Hayes Valley, 2 people, tonight at 8",
  "Lively spot in the Mission, 4 friends, around 9pm",
  "Romantic place in North Beach, table for 2, 7:30",
  "Casual tacos in the Castro, 3 people, tonight",
  "Something upscale in SoMa, party of 6, 8pm",
  "Cozy ramen in Japantown, 2 people, tonight at 7",
  "Outdoor dining in Marina, 4 people, sunset",
  "Late night bites in Tenderloin, 2 people, 10pm",
];

function AnimatedPlaceholder() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const current = SUGGESTIONS[currentIndex];

    if (!isDeleting) {
      if (displayed.length < current.length) {
        timeoutRef.current = setTimeout(() => {
          setDisplayed(current.slice(0, displayed.length + 1));
        }, 40 + Math.random() * 30);
      } else {
        timeoutRef.current = setTimeout(() => setIsDeleting(true), 2500);
      }
    } else {
      if (displayed.length > 0) {
        timeoutRef.current = setTimeout(() => {
          setDisplayed(displayed.slice(0, -1));
        }, 20);
      } else {
        setIsDeleting(false);
        setCurrentIndex((prev) => (prev + 1) % SUGGESTIONS.length);
      }
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [displayed, isDeleting, currentIndex]);

  return displayed;
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  delay: string;
}) {
  return (
    <div
      className="group rounded-2xl border bg-card p-6 transition-all duration-500 hover:shadow-lg hover:-translate-y-1"
      style={{ animationDelay: delay }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {desc}
      </p>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const [stepsVisible, setStepsVisible] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHeroVisible(true);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === featuresRef.current) setFeaturesVisible(true);
            if (entry.target === stepsRef.current) setStepsVisible(true);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (featuresRef.current) observer.observe(featuresRef.current);
    if (stepsRef.current) observer.observe(stepsRef.current);

    return () => observer.disconnect();
  }, []);

  const filteredSuggestions = query.length > 0
    ? SUGGESTIONS.filter((s) => s.toLowerCase().includes(query.toLowerCase()))
    : SUGGESTIONS.slice(0, 5);

  const handleGo = (text?: string) => {
    const finalQuery = text || query;
    if (!finalQuery.trim()) return;
    router.push(`/dashboard/scout?q=${encodeURIComponent(finalQuery)}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="text-xl font-bold tracking-tight">Scout</span>
          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/scout"
              className={cn(buttonVariants())}
            >
              Start Scouting
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="relative overflow-hidden px-4 pt-20 pb-24">
          <div
            className={cn(
              "mx-auto max-w-3xl text-center transition-all duration-1000",
              heroVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            )}
          >
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
              Stop guessing.
              <br />
              <span className="bg-gradient-to-r from-neutral-500 to-neutral-400 bg-clip-text text-transparent">
                Start scouting.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Scout calls restaurants right now so you don&apos;t walk into a
              bad night. Real-time intel in under 3 minutes.
            </p>

            {/* Animated search box */}
            <div
              className={cn(
                "relative mx-auto mt-10 max-w-xl transition-all duration-1000 delay-300",
                heroVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              )}
            >
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onKeyDown={(e) => e.key === "Enter" && handleGo()}
                  className="w-full rounded-2xl border bg-card px-5 py-4 pr-24 text-base shadow-lg outline-none transition-shadow focus:shadow-xl focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                  placeholder=""
                />
                {!query && (
                  <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-base text-muted-foreground/50">
                    <AnimatedPlaceholder />
                    <span className="animate-pulse">|</span>
                  </span>
                )}
                <Button
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-4"
                  onClick={() => handleGo()}
                >
                  Scout
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>

              {/* Suggestions dropdown */}
              <div
                className={cn(
                  "absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-xl border bg-card shadow-xl transition-all duration-300",
                  showSuggestions
                    ? "opacity-100 translate-y-0 max-h-80"
                    : "opacity-0 -translate-y-2 max-h-0 border-transparent shadow-none"
                )}
              >
                {filteredSuggestions.map((suggestion, i) => (
                  <button
                    key={suggestion}
                    onMouseDown={() => {
                      setQuery(suggestion);
                      handleGo(suggestion);
                    }}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm transition-colors hover:bg-muted"
                    style={{
                      animationDelay: `${i * 50}ms`,
                    }}
                  >
                    <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section ref={featuresRef} className="px-4 py-20">
          <div
            className={cn(
              "mx-auto max-w-4xl transition-all duration-1000",
              featuresVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-12"
            )}
          >
            <div className="grid gap-6 sm:grid-cols-3">
              <FeatureCard
                icon={Phone}
                title="Parallel Calls"
                desc="Scout calls 3-5 restaurants at once with a natural, human-like voice agent. No hold music for you."
                delay="0ms"
              />
              <FeatureCard
                icon={Clock}
                title="Under 3 Minutes"
                desc="Real-time results stream in as each call completes. Watch live transcripts as conversations happen."
                delay="150ms"
              />
              <FeatureCard
                icon={Zap}
                title="Smart Comparison"
                desc="AI-ranked results with wait times, vibe reports, menu availability, and one-click booking."
                delay="300ms"
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section ref={stepsRef} className="border-t px-4 py-20">
          <div
            className={cn(
              "mx-auto max-w-2xl transition-all duration-1000",
              stepsVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-12"
            )}
          >
            <h2 className="text-center text-3xl font-bold tracking-tight">
              How it works
            </h2>
            <div className="mt-12 space-y-8">
              {[
                {
                  step: "1",
                  title: "Tell us what you want",
                  desc: "Neighborhood, party size, time, and vibe. Just type naturally.",
                },
                {
                  step: "2",
                  title: "Pick your restaurants",
                  desc: "We pull from Google Places with photos, ratings, and cuisine. Pick up to 5.",
                },
                {
                  step: "3",
                  title: "Scout calls them all",
                  desc: "AI calls each restaurant in parallel. Watch live transcripts in real time.",
                },
                {
                  step: "4",
                  title: "Compare and book",
                  desc: "See a ranked comparison with wait times, vibe, and menu intel. One-click to book.",
                },
              ].map((item, i) => (
                <div
                  key={item.step}
                  className={cn(
                    "flex gap-5 transition-all duration-700",
                    stepsVisible
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-8"
                  )}
                  style={{ transitionDelay: `${i * 150}ms` }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="mt-1 text-base text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
