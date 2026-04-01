"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RestaurantPicker } from "@/components/restaurant-picker";
import {
  Loader2,
  MapPin,
  Send,
  Sparkles,
  Clock,
  Users,
  Navigation,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isInBayArea, getRandomRejection } from "@/lib/sf-neighborhoods";
import type { Restaurant, Mission } from "@/lib/types";

interface Message {
  role: "user" | "scout";
  text: string;
  status?: "searching" | "found";
}

interface ParsedQuery {
  neighborhood: string | null;
  party_size: number | null;
  desired_time: string | null;
  vibe: string | null;
  dietary_needs: string[] | null;
  ready: boolean;
  questions: string[];
}

const QUICK_PROMPTS = [
  { text: "Dinner in Hayes Valley for 2 tonight", icon: "🍷", label: "Date night in Hayes Valley" },
  { text: "Lively spot in the Mission, 4 friends, 9pm", icon: "🎉", label: "Friends night in the Mission" },
  { text: "Romantic dinner in North Beach, 2 people, 7:30", icon: "✨", label: "Romantic in North Beach" },
  { text: "Casual tacos in the Castro for 3 tonight", icon: "🌮", label: "Tacos in the Castro" },
  { text: "Brunch in Marina for 4 on Sunday", icon: "🥂", label: "Brunch in Marina" },
  { text: "Late night ramen in Japantown for 2", icon: "🍜", label: "Late night in Japantown" },
];

export default function ScoutPage() {
  return (
    <Suspense>
      <ScoutPageContent />
    </Suspense>
  );
}

function ScoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [accumulated, setAccumulated] = useState<Partial<ParsedQuery>>({});
  const [mission, setMission] = useState<Mission | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [step, setStep] = useState<"chat" | "pick" | "launching">("chat");
  const [launchLoading, setLaunchLoading] = useState(false);
  const [visibleMsgs, setVisibleMsgs] = useState(0);
  const [searching, setSearching] = useState(false);
  const [emptyVisible, setEmptyVisible] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialProcessed = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setEmptyVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMsgs, loading, searching]);

  useEffect(() => {
    if (visibleMsgs < messages.length) {
      const delay = messages[visibleMsgs]?.role === "scout" ? 250 : 30;
      const timer = setTimeout(() => setVisibleMsgs((v) => v + 1), delay);
      return () => clearTimeout(timer);
    }
  }, [visibleMsgs, messages]);

  useEffect(() => {
    if (initialQuery && !initialProcessed.current) {
      initialProcessed.current = true;
      processMessage(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const processMessage = useCallback(
    async (text: string) => {
      const userMsg: Message = { role: "user", text };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/parse-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updatedMessages, accumulated }),
        });
        const data: ParsedQuery = await res.json();

        const newAcc = {
          neighborhood: data.neighborhood || accumulated.neighborhood,
          party_size: data.party_size ?? accumulated.party_size,
          desired_time: data.desired_time || accumulated.desired_time,
          vibe: data.vibe || accumulated.vibe,
          dietary_needs: data.dietary_needs || accumulated.dietary_needs,
        };
        setAccumulated(newAcc);

        if (data.ready && data.neighborhood) {
          if (!isInBayArea(data.neighborhood)) {
            setMessages((prev) => [
              ...prev,
              { role: "scout", text: getRandomRejection() },
            ]);
            setLoading(false);
            return;
          }

          const summary = [
            data.neighborhood,
            data.party_size && `${data.party_size} people`,
            data.desired_time,
            data.vibe && `${data.vibe} vibe`,
          ]
            .filter(Boolean)
            .join(", ");

          setMessages((prev) => [
            ...prev,
            { role: "scout", text: `${summary} — let me find the best spots...`, status: "searching" },
          ]);
          setLoading(false);
          setSearching(true);

          const createRes = await fetch("/api/missions/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              neighborhood: data.neighborhood,
              party_size: data.party_size,
              desired_time: data.desired_time,
              vibe: data.vibe || undefined,
              dietary_needs: data.dietary_needs || undefined,
            }),
          });

          if (!createRes.ok) {
            const err = await createRes.json();
            setMessages((prev) => [
              ...prev,
              { role: "scout", text: err.error || "Something went wrong. Try again?" },
            ]);
            setSearching(false);
            return;
          }

          const missionData = await createRes.json();
          setMission(missionData.mission);
          setRestaurants(missionData.restaurants);
          setSearching(false);
          setStep("pick");
          return;
        }

        const questionText =
          data.questions.length > 0
            ? data.questions.join(" ")
            : "Tell me the neighborhood, party size, and time!";
        setMessages((prev) => [...prev, { role: "scout", text: questionText }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "scout", text: "Hmm, something broke. Try again?" },
        ]);
      }

      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    [messages, accumulated]
  );

  const handleSend = () => {
    if (!input.trim() || loading || searching) return;
    processMessage(input.trim());
  };

  const handleLaunch = async (restaurantIds: string[]) => {
    if (!mission) return;
    setLaunchLoading(true);
    setStep("launching");
    try {
      const res = await fetch(`/api/missions/${mission.id}/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_ids: restaurantIds }),
      });
      if (!res.ok) throw new Error("Failed to launch calls");
      router.push(`/dashboard/mission/${mission.id}`);
    } catch {
      alert("Something went wrong launching the calls. Please try again.");
      setStep("pick");
    } finally {
      setLaunchLoading(false);
    }
  };

  const chips = [
    accumulated.neighborhood && { icon: Navigation, label: accumulated.neighborhood, color: "text-orange-700 bg-orange-50 border-orange-200" },
    accumulated.party_size && { icon: Users, label: `${accumulated.party_size}`, color: "text-blue-700 bg-blue-50 border-blue-200" },
    accumulated.desired_time && { icon: Clock, label: accumulated.desired_time, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  ].filter(Boolean) as { icon: typeof Navigation; label: string; color: string }[];

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {step === "chat" && (
        <div className="flex min-h-0 flex-1 flex-col chat-gradient-bg">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto">
            {/* Empty state */}
            {messages.length === 0 && !loading && (
              <div
                className={cn(
                  "flex h-full flex-col items-center justify-center px-4 transition-all duration-700",
                  emptyVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
              >
                {/* Animated icon */}
                <div className="relative mb-6 animate-float">
                  <div className="absolute -inset-5 rounded-full bg-gradient-to-br from-orange-300/30 to-amber-200/30 blur-2xl animate-pulse-ring" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-xl shadow-orange-200/50">
                    <MapPin className="h-8 w-8 text-white" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold tracking-tight">
                  Where should we scout?
                </h2>
                <p className="mt-2 max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
                  Tell me what you&apos;re craving — I&apos;ll call ahead and get the real deal.
                </p>

                {/* Quick prompts grid */}
                <div className="mt-8 grid w-full max-w-xl grid-cols-2 gap-2 sm:grid-cols-3">
                  {QUICK_PROMPTS.map((p, i) => (
                    <button
                      key={p.text}
                      onClick={() => processMessage(p.text)}
                      className={cn(
                        "group relative flex flex-col items-start gap-1 rounded-2xl border bg-card p-3.5 text-left transition-all duration-300 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-100/40 hover:-translate-y-1",
                        emptyVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                      )}
                      style={{
                        transitionDelay: `${200 + i * 60}ms`,
                      }}
                    >
                      <span className="text-xl">{p.icon}</span>
                      <span className="text-xs font-medium text-foreground leading-tight">
                        {p.label}
                      </span>
                      <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/0 transition-all group-hover:text-orange-400 group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
              {messages.slice(0, visibleMsgs).map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2.5 animate-in duration-400",
                    msg.role === "user"
                      ? "justify-end fade-in slide-in-from-bottom-2"
                      : "justify-start fade-in slide-in-from-bottom-2"
                  )}
                  style={{ animationFillMode: "both" }}
                >
                  {msg.role === "scout" && (
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 shadow-sm shadow-orange-200/40">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] text-sm leading-relaxed",
                      msg.role === "user"
                        ? "rounded-2xl rounded-br-md bg-gradient-to-br from-orange-600 to-orange-500 px-4 py-3 text-white shadow-md shadow-orange-200/30"
                        : "rounded-2xl rounded-tl-md border border-border/60 bg-white px-4 py-3 shadow-sm"
                    )}
                  >
                    {msg.text}
                    {msg.status === "searching" && (
                      <span className="mt-2 flex items-center gap-1.5 text-xs opacity-70">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Searching Google Places...
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {(loading || searching) && (
                <div className="flex gap-2.5 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 shadow-sm shadow-orange-200/40">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="rounded-2xl rounded-tl-md border border-border/60 bg-white px-4 py-3 shadow-sm">
                    {searching ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                        Finding restaurants near {accumulated.neighborhood || "you"}...
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 py-0.5">
                        <span className="h-2 w-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 rounded-full bg-orange-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 rounded-full bg-orange-200 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Gathered info bar + Input — glass panel at bottom */}
          <div className="shrink-0 border-t glass">
            {/* Info chips */}
            {chips.length > 0 && (
              <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 mr-1">Gathered:</span>
                {chips.map((chip, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium animate-in fade-in zoom-in-95 duration-200",
                      chip.color
                    )}
                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                  >
                    <chip.icon className="h-2.5 w-2.5" />
                    {chip.label}
                  </div>
                ))}
              </div>
            )}

            {/* Input row */}
            <div className="flex items-center gap-2 px-4 py-3">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={
                    messages.length === 0
                      ? "Dinner in Hayes Valley for 2 tonight..."
                      : "Type your answer..."
                  }
                  className="w-full rounded-2xl border border-border/60 bg-white px-4 py-3 text-sm shadow-sm outline-none transition-all duration-200 focus:border-orange-300 focus:shadow-lg focus:shadow-orange-100/30 focus:ring-2 focus:ring-orange-100"
                  disabled={loading || searching}
                  autoFocus
                />
              </div>
              <Button
                size="icon"
                className={cn(
                  "h-11 w-11 shrink-0 rounded-2xl transition-all duration-300",
                  input.trim() && !loading && !searching
                    ? "bg-gradient-to-br from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 shadow-md shadow-orange-200/40 scale-100"
                    : "bg-muted text-muted-foreground shadow-none scale-95"
                )}
                onClick={handleSend}
                disabled={loading || searching || !input.trim()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Restaurant picker */}
      {(step === "pick" || step === "launching") && restaurants.length > 0 && (
        <div className="flex-1 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <RestaurantPicker
            restaurants={restaurants}
            onLaunch={handleLaunch}
            loading={launchLoading}
          />
        </div>
      )}
    </div>
  );
}
