"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Phone, Zap, Clock, ArrowRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { SF_NEIGHBORHOODS } from "@/lib/sf-neighborhoods";

const SUGGESTIONS = [
  "Chill dinner in Hayes Valley, 2 people, tonight at 8",
  "Lively spot in the Mission, 4 friends, around 9pm",
  "Romantic place in North Beach, table for 2, 7:30",
  "Casual tacos in the Castro, 3 people, tonight",
  "Something upscale in SoMa, party of 6, 8pm",
  "Cozy ramen in Japantown, 2 people, tonight at 7",
  "Outdoor dining in Marina, 4 people, sunset",
  "Late night bites in Dogpatch, 2 people, 10pm",
  "Best pizza near Nob Hill, 3 friends, tonight",
  "Dim sum in Chinatown, 5 people, Sunday brunch",
];

const NEIGHBORHOOD_PILLS = SF_NEIGHBORHOODS.slice(0, 12);

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
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 transition-colors group-hover:bg-orange-100">
        <Icon className="h-6 w-6 text-orange-600" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {desc}
      </p>
    </div>
  );
}

function GoldenGateSVG({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Cables */}
      <path
        d="M0 180 Q200 20 400 100 Q600 180 800 40"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.15"
      />
      <path
        d="M0 190 Q200 40 400 110 Q600 190 800 50"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.1"
      />
      {/* Towers */}
      <rect x="195" y="30" width="10" height="170" rx="2" fill="currentColor" opacity="0.12" />
      <rect x="595" y="50" width="10" height="150" rx="2" fill="currentColor" opacity="0.12" />
      {/* Vertical cables */}
      {[250, 300, 350, 450, 500, 550].map((x, i) => (
        <line
          key={x}
          x1={x}
          y1={70 + i * 5}
          x2={x}
          y2={180}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.08"
        />
      ))}
      {/* Road */}
      <rect x="0" y="175" width="800" height="6" rx="3" fill="currentColor" opacity="0.08" />
    </svg>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const [stepsVisible, setStepsVisible] = useState(false);
  const [pillsVisible, setPillsVisible] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHeroVisible(true);
    const pillTimer = setTimeout(() => setPillsVisible(true), 800);

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

    return () => {
      clearTimeout(pillTimer);
      observer.disconnect();
    };
  }, []);

  const filteredSuggestions =
    query.length > 0
      ? SUGGESTIONS.filter((s) =>
          s.toLowerCase().includes(query.toLowerCase())
        )
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
          <span className="text-xl font-bold tracking-tight">
            Scout
            <span className="ml-1.5 text-xs font-normal text-orange-500 align-super">
              SF
            </span>
          </span>
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

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pt-20 pb-8">
          {/* Golden Gate background element */}
          <div className="pointer-events-none absolute inset-x-0 top-16 mx-auto max-w-5xl text-orange-500">
            <GoldenGateSVG className="w-full" />
          </div>

          <div
            className={cn(
              "relative mx-auto max-w-3xl text-center transition-all duration-1000",
              heroVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            )}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-orange-50 px-4 py-1.5 text-sm text-orange-700">
              <MapPin className="h-3.5 w-3.5" />
              SF Bay Area Only
            </div>

            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
              Stop guessing.
              <br />
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                Start scouting.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Scout calls SF restaurants right now so you don&apos;t walk into a
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
                  onBlur={() =>
                    setTimeout(() => setShowSuggestions(false), 200)
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleGo()}
                  className="w-full rounded-2xl border bg-card px-5 py-4 pr-24 text-base shadow-lg outline-none transition-shadow focus:shadow-xl focus:ring-2 focus:ring-orange-200 placeholder:text-muted-foreground/50"
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-orange-600 px-4 hover:bg-orange-700"
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
                    className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm transition-colors hover:bg-orange-50"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-orange-400" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Neighborhood pills */}
            <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-2">
              {NEIGHBORHOOD_PILLS.map((hood, i) => (
                <button
                  key={hood}
                  onClick={() => {
                    setQuery(hood as string);
                    handleGo(hood as string);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs text-muted-foreground transition-all duration-500 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700",
                    pillsVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4"
                  )}
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  {hood}
                </button>
              ))}
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
                desc="Scout calls 3-5 SF restaurants at once with a natural, human-like voice agent. No hold music for you."
                delay="0ms"
              />
              <FeatureCard
                icon={Clock}
                title="Under 3 Minutes"
                desc="Real-time results stream in as each call completes. Faster than waiting for the N-Judah."
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
                  desc: 'Pick a neighborhood, party size, time, and vibe. Like "Mission, 4 friends, 9pm, lively".',
                },
                {
                  step: "2",
                  title: "Pick your restaurants",
                  desc: "We pull from Google Places with photos, ratings, and cuisine. Pick up to 5 spots.",
                },
                {
                  step: "3",
                  title: "Scout calls them all",
                  desc: "Our AI calls each restaurant simultaneously. Watch live transcripts as the conversations happen.",
                },
                {
                  step: "4",
                  title: "Compare and book",
                  desc: "See a ranked comparison with wait times, tonight's vibe, and menu intel. Book your pick with one click.",
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
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-600 text-base font-bold text-white">
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
