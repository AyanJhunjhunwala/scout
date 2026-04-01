"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Phone, Sparkles, Map } from "lucide-react";
import { cn } from "@/lib/utils";
const NEIGHBORHOOD_PILL_LIST = [
  "Mission", "Hayes Valley", "North Beach", "Castro", "Marina",
  "SoMa", "Japantown", "Nob Hill", "Russian Hill", "Pacific Heights",
  "Sunset", "Richmond", "Dogpatch", "Bernal Heights",
];

const SUGGESTIONS = [
  "Chill dinner in Hayes Valley, 2 people, tonight at 8",
  "Lively spot in the Mission, 4 friends, around 9pm",
  "Romantic place in North Beach, table for 2, 7:30",
  "Casual tacos in the Castro, 3 people, tonight",
  "Something upscale in SoMa, party of 6, 8pm",
  "Cozy ramen in Japantown, 2 people, tonight at 7",
  "Outdoor dining in Marina, 4 people, sunset",
  "Late night bites in Dogpatch, 2 people, 10pm",
];

const NEIGHBORHOOD_PILLS = NEIGHBORHOOD_PILL_LIST;

const USE_CASES = [
  {
    question: "Is Réveille Coffee on Columbus crowded?",
    answer: "2 min wait, plenty of seats by the window. Quiet vibe — good for laptops.",
    tag: "Study spot",
    emoji: "☕",
    color: "from-amber-500 to-orange-500",
  },
  {
    question: "Does Tartine have patio seating open tonight?",
    answer: "3 tables open outside right now! Indoor is a 20 min wait though.",
    tag: "Patio check",
    emoji: "🌿",
    color: "from-green-500 to-emerald-500",
  },
  {
    question: "Any vegan options at Burma Superstar?",
    answer: "Full vegan section on the menu. Tea leaf salad is vegan. 25 min wait, lively crowd.",
    tag: "Dietary needs",
    emoji: "🌱",
    color: "from-emerald-500 to-teal-500",
  },
  {
    question: "Is there a long wait at Zuni Café right now?",
    answer: "40 min for a table, but bar seating is open immediately. They recommend the roast chicken.",
    tag: "Wait time",
    emoji: "⏱",
    color: "from-blue-500 to-indigo-500",
  },
  {
    question: "Can Dumpling Time do a party of 8 tonight?",
    answer: "Yes! They have a semi-private area for large groups. Available after 7:30pm tonight.",
    tag: "Large party",
    emoji: "🥟",
    color: "from-rose-500 to-pink-500",
  },
  {
    question: "Is Nopalito's back garden open?",
    answer: "Garden is open tonight, 2 tables left. They just got a new mezcal menu too.",
    tag: "Hidden gem",
    emoji: "🌮",
    color: "from-orange-500 to-red-500",
  },
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

function GoldenGateSVG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M0 180 Q200 20 400 100 Q600 180 800 40" stroke="currentColor" strokeWidth="3" opacity="0.15" />
      <path d="M0 190 Q200 40 400 110 Q600 190 800 50" stroke="currentColor" strokeWidth="2" opacity="0.1" />
      <rect x="195" y="30" width="10" height="170" rx="2" fill="currentColor" opacity="0.12" />
      <rect x="595" y="50" width="10" height="150" rx="2" fill="currentColor" opacity="0.12" />
      {[250, 300, 350, 450, 500, 550].map((x, i) => (
        <line key={x} x1={x} y1={70 + i * 5} x2={x} y2={180} stroke="currentColor" strokeWidth="1" opacity="0.08" />
      ))}
      <rect x="0" y="175" width="800" height="6" rx="3" fill="currentColor" opacity="0.08" />
    </svg>
  );
}

function UseCaseCarousel() {
  const [active, setActive] = useState(0);
  const [typing, setTyping] = useState(false);
  const [answerVisible, setAnswerVisible] = useState(false);

  useEffect(() => {
    setTyping(true);
    setAnswerVisible(false);
    const t1 = setTimeout(() => { setTyping(false); setAnswerVisible(true); }, 1800);
    const t2 = setTimeout(() => {
      setAnswerVisible(false);
      setTimeout(() => setActive((prev) => (prev + 1) % USE_CASES.length), 400);
    }, 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active]);

  const c = USE_CASES[active];

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Mock phone frame */}
      <div className="rounded-3xl border-2 border-border/60 bg-card p-5 shadow-2xl shadow-orange-100/30">
        {/* Mini header */}
        <div className="flex items-center gap-2 border-b pb-3 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold">Scout</span>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-green-600 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        </div>

        {/* Tag */}
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg">{c.emoji}</span>
          <span className={cn(
            "rounded-full bg-gradient-to-r px-2.5 py-0.5 text-[11px] font-semibold text-white",
            c.color
          )}>
            {c.tag}
          </span>
        </div>

        {/* User message */}
        <div className="flex justify-end mb-3">
          <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-to-br from-orange-600 to-orange-500 px-3.5 py-2.5 text-sm text-white shadow-sm animate-in fade-in slide-in-from-right-2 duration-500">
            {c.question}
          </div>
        </div>

        {/* Scout reply */}
        <div className="flex gap-2">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
            <Phone className="h-3 w-3 text-white" />
          </div>
          <div className="max-w-[85%] rounded-2xl rounded-bl-sm border bg-background px-3.5 py-2.5 text-sm">
            {typing ? (
              <div className="flex items-center gap-1.5 py-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            ) : (
              <span className={cn(
                "transition-all duration-500",
                answerVisible ? "opacity-100" : "opacity-0"
              )}>
                {c.answer}
              </span>
            )}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="mt-4 flex justify-center gap-1.5">
          {USE_CASES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === active ? "w-6 bg-orange-500" : "w-1.5 bg-border hover:bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [heroVisible, setHeroVisible] = useState(false);
  const [pillsVisible, setPillsVisible] = useState(false);
  const [showcaseVisible, setShowcaseVisible] = useState(false);
  const showcaseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHeroVisible(true);
    const t1 = setTimeout(() => setPillsVisible(true), 600);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setShowcaseVisible(true);
        });
      },
      { threshold: 0.15 }
    );
    if (showcaseRef.current) observer.observe(showcaseRef.current);

    return () => { clearTimeout(t1); observer.disconnect(); };
  }, []);

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
            <span className="ml-1.5 text-xs font-normal text-orange-500 align-super">SF</span>
          </span>
          <div className="flex gap-2">
            <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost" }))}>
              Dashboard
            </Link>
            <Link href="/dashboard/explore" className={cn(buttonVariants({ variant: "ghost" }), "gap-1.5")}>
              <Map className="h-4 w-4" />
              Explore
            </Link>
            <Link href="/dashboard/scout" className={cn(buttonVariants())}>
              Start Scouting
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pt-20 pb-16 sm:pt-28 sm:pb-20">
          <div className="pointer-events-none absolute inset-x-0 top-12 mx-auto max-w-5xl text-orange-500">
            <GoldenGateSVG className="w-full" />
          </div>

          <div
            className={cn(
              "relative mx-auto max-w-3xl text-center transition-all duration-1000",
              heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-orange-50 px-4 py-1.5 text-sm text-orange-700">
              <MapPin className="h-3.5 w-3.5" />
              For the Bay
            </div>

            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl leading-[1.1]">
              Vibe check
              <br />
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                any restaurant.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Scout calls SF restaurants so you don&apos;t walk into a bad night.
              Wait times, vibe, dietary restrictions — in under 3 minutes.
            </p>

            {/* Search box */}
            <div
              className={cn(
                "relative mx-auto mt-10 max-w-xl transition-all duration-1000 delay-300",
                heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
            >
              <div className="relative z-20">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGo()}
                  className="w-full rounded-2xl border bg-card px-5 py-4 pr-28 text-base shadow-lg outline-none transition-shadow focus:shadow-xl focus:ring-2 focus:ring-orange-200 placeholder:text-muted-foreground/50"
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-orange-600 px-5 hover:bg-orange-700"
                  onClick={() => handleGo()}
                >
                  Scout
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Neighborhood pills */}
            <div className="mx-auto mt-8 max-w-2xl">
              <p
                className={cn(
                  "mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground transition-all duration-700",
                  pillsVisible ? "opacity-100" : "opacity-0"
                )}
              >
                Popular neighborhoods
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {NEIGHBORHOOD_PILLS.map((hood, i) => (
                  <button
                    key={hood}
                    onClick={() => handleGo(hood as string)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm text-muted-foreground transition-all duration-500 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 hover:shadow-sm",
                      pillsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                    )}
                    style={{ transitionDelay: `${i * 40}ms` }}
                  >
                    {hood}
                  </button>
                ))}
              </div>
            </div>

            {/* Explore map CTA */}
            <div
              className={cn(
                "mx-auto mt-8 transition-all duration-1000 delay-700",
                pillsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
            >
              <Link
                href="/dashboard/explore"
                className="group inline-flex items-center gap-2.5 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-3 text-sm font-medium text-orange-700 shadow-sm transition-all hover:shadow-md hover:border-orange-300 hover:from-orange-100 hover:to-amber-100"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-sm">
                  <Map className="h-4 w-4 text-white" />
                </div>
                <div className="text-left">
                  <span className="font-semibold">Explore the map</span>
                  <span className="ml-1.5 text-orange-500/70">— browse &amp; scout nearby restaurants</span>
                </div>
                <ArrowRight className="h-4 w-4 text-orange-400 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Use-case showcase */}
        <section ref={showcaseRef} className="relative border-t bg-muted/30 px-4 py-20 sm:py-28">
          {/* Decorative gradient */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-orange-50/30 to-transparent" />

          <div
            className={cn(
              "relative mx-auto max-w-5xl transition-all duration-1000",
              showcaseVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            )}
          >
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              {/* Left — text */}
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Phone className="h-3 w-3 text-orange-500" />
                  Real calls. Real answers.
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Ask anything about
                  <br />
                  <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                    any SF restaurant.
                  </span>
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                  Scout will call the restaurant and get you answers that Google and Yelp can&apos;t — live wait times, patio availability, dietary options,
                  large party seating, and more.
                </p>

                {/* Mini feature list */}
                <div className="mt-8 grid grid-cols-2 gap-3">
                  {[
                    { emoji: "⏱", text: "Live wait times" },
                    { emoji: "🪑", text: "Patio & seating" },
                    { emoji: "🌱", text: "Dietary options" },
                    { emoji: "👥", text: "Large party check" },
                    { emoji: "🎵", text: "Current vibe" },
                    { emoji: "📋", text: "Menu intel" },
                  ].map((f, i) => (
                    <div
                      key={f.text}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 text-sm transition-all duration-500",
                        showcaseVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                      )}
                      style={{ transitionDelay: `${300 + i * 80}ms` }}
                    >
                      <span className="text-base">{f.emoji}</span>
                      <span className="text-muted-foreground">{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — animated carousel */}
              <div
                className={cn(
                  "transition-all duration-1000 delay-300",
                  showcaseVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}
              >
                <UseCaseCarousel />
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="border-t px-4 py-16 text-center">
          <div className="mx-auto max-w-md">
            <h3 className="text-2xl font-bold tracking-tight">Ready to vibe check?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Stop refreshing Yelp reviews from 2019. Get real-time answers.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/dashboard/scout"
                className={cn(
                  buttonVariants(),
                  "rounded-xl bg-orange-600 px-8 py-5 text-base hover:bg-orange-700"
                )}
              >
                Start Scouting
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/dashboard/explore"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "rounded-xl px-6 py-5 text-base gap-2"
                )}
              >
                <Map className="h-4 w-4" />
                Explore the map
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
