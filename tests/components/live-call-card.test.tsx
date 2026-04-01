import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LiveCallCard } from "@/components/live-call-card";
import type { ScoutCall, Restaurant, Mission } from "@/lib/types";

// Mock LiveAudioPlayer to avoid audio API issues in jsdom
vi.mock("@/components/live-audio-player", () => ({
  LiveAudioPlayer: () => null,
}));

const restaurant: Restaurant = {
  id: "r1",
  google_place_id: "p1",
  name: "Tartine Bakery",
  phone: "+14155550000",
  address: "600 Guerrero St, SF",
  cuisine: "Bakery",
  rating: 4.8,
  price_level: 2,
  photo_ref: null,
  lat: 37.76,
  lng: -122.42,
  cached_at: new Date().toISOString(),
};

const mission: Mission = {
  id: "m1",
  user_id: "u1",
  raw_query: "brunch in the Mission for 2",
  party_size: 2,
  desired_time: "brunch",
  neighborhood: "Mission",
  vibe: "chill",
  dietary_needs: null,
  status: "complete",
  created_at: new Date().toISOString(),
};

const baseCall: ScoutCall = {
  id: "c1",
  mission_id: "m1",
  restaurant_id: "r1",
  vapi_call_id: null,
  status: "queued",
  transcript: null,
  wait_time: null,
  vibe_report: null,
  menu_notes: null,
  availability: null,
  special_notes: null,
  recommendation: null,
  recommendation_reason: null,
  call_summary: null,
  highlights: null,
  noise_level: null,
  crowd_level: null,
  outdoor_seating: null,
  bar_seating: null,
  vibe_tags: null,
  price_per_person: null,
  duration_seconds: null,
  started_at: null,
  completed_at: null,
  listen_url: null,
};

// ── Status states ─────────────────────────────────────────────────────────────

describe("LiveCallCard — status badges", () => {
  it("shows restaurant name", () => {
    render(<LiveCallCard call={baseCall} restaurant={restaurant} />);
    expect(screen.getByText("Tartine Bakery")).toBeInTheDocument();
  });

  it("shows 'Queued' status", () => {
    render(<LiveCallCard call={baseCall} restaurant={restaurant} />);
    expect(screen.getByText("Queued")).toBeInTheDocument();
  });

  it("shows 'Ringing…' status", () => {
    render(<LiveCallCard call={{ ...baseCall, status: "ringing" }} restaurant={restaurant} />);
    expect(screen.getByText("Ringing…")).toBeInTheDocument();
  });

  it("shows 'Talking…' status", () => {
    render(<LiveCallCard call={{ ...baseCall, status: "connected" }} restaurant={restaurant} />);
    expect(screen.getByText("Talking…")).toBeInTheDocument();
  });

  it("shows 'Done' badge for ended call", () => {
    render(<LiveCallCard call={{ ...baseCall, status: "ended" }} restaurant={restaurant} />);
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("shows 'No Answer' status", () => {
    render(<LiveCallCard call={{ ...baseCall, status: "no_answer" }} restaurant={restaurant} />);
    expect(screen.getByText("No Answer")).toBeInTheDocument();
  });

  it("shows 'Voicemail' status", () => {
    render(<LiveCallCard call={{ ...baseCall, status: "voicemail" }} restaurant={restaurant} />);
    expect(screen.getByText("Voicemail")).toBeInTheDocument();
  });

  it("shows 'Failed' status", () => {
    render(<LiveCallCard call={{ ...baseCall, status: "failed" }} restaurant={restaurant} />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });
});

// ── Ended call with results ───────────────────────────────────────────────────

const endedCall: ScoutCall = {
  ...baseCall,
  status: "ended",
  recommendation: "best_bet",
  recommendation_reason: "Great food and short wait.",
  call_summary: "Called and spoke with the host. Short wait, great atmosphere.",
  highlights: ["No wait right now", "Patio available"],
  wait_time: "no wait",
  vibe_report: "chill and cozy",
  availability: "tables at 11am",
  menu_notes: "Full menu available",
  noise_level: "quiet",
  crowd_level: "moderate",
  outdoor_seating: true,
  bar_seating: false,
  vibe_tags: ["date-friendly", "dog-friendly"],
  price_per_person: "~$20-35",
};

describe("LiveCallCard — completed call results", () => {
  it("shows call summary", () => {
    render(<LiveCallCard call={endedCall} restaurant={restaurant} />);
    expect(screen.getByText(/Called and spoke with the host/)).toBeInTheDocument();
  });

  it("shows highlights", () => {
    render(<LiveCallCard call={endedCall} restaurant={restaurant} />);
    expect(screen.getByText("No wait right now")).toBeInTheDocument();
    expect(screen.getByText("Patio available")).toBeInTheDocument();
  });

  it("shows wait time", () => {
    render(<LiveCallCard call={endedCall} restaurant={restaurant} />);
    expect(screen.getByText("no wait")).toBeInTheDocument();
  });

  it("shows vibe report", () => {
    render(<LiveCallCard call={endedCall} restaurant={restaurant} />);
    expect(screen.getByText("chill and cozy")).toBeInTheDocument();
  });

  it("shows menu notes", () => {
    render(<LiveCallCard call={endedCall} restaurant={restaurant} />);
    expect(screen.getByText("Full menu available")).toBeInTheDocument();
  });

  it("shows price per person", () => {
    render(<LiveCallCard call={endedCall} restaurant={restaurant} />);
    expect(screen.getByText(/~\$20-35/)).toBeInTheDocument();
  });

  it("shows noise level badge", () => {
    render(<LiveCallCard call={endedCall} restaurant={restaurant} />);
    expect(screen.getByText("Quiet")).toBeInTheDocument();
  });

  it("shows crowd level badge", () => {
    render(<LiveCallCard call={endedCall} restaurant={restaurant} />);
    expect(screen.getByText("Moderate")).toBeInTheDocument();
  });

  it("shows outdoor seating badge when true", () => {
    render(<LiveCallCard call={endedCall} restaurant={restaurant} />);
    expect(screen.getByText("Outdoor seating")).toBeInTheDocument();
  });

  it("does not show bar seating badge when false", () => {
    render(<LiveCallCard call={endedCall} restaurant={restaurant} />);
    expect(screen.queryByText("Bar seating")).not.toBeInTheDocument();
  });

  it("shows vibe tags", () => {
    render(<LiveCallCard call={endedCall} restaurant={restaurant} />);
    expect(screen.getByText("date-friendly")).toBeInTheDocument();
    expect(screen.getByText("dog-friendly")).toBeInTheDocument();
  });

  it("shows 'Best Bet' recommendation badge", () => {
    render(<LiveCallCard call={endedCall} restaurant={restaurant} />);
    expect(screen.getByText("Best Bet")).toBeInTheDocument();
  });

  it("shows recommendation reason", () => {
    render(<LiveCallCard call={endedCall} restaurant={restaurant} />);
    expect(screen.getByText("Great food and short wait.")).toBeInTheDocument();
  });

  it("shows Book button for non-skip", () => {
    const onBook = vi.fn();
    render(<LiveCallCard call={endedCall} restaurant={restaurant} onBook={onBook} />);
    expect(screen.getByRole("button", { name: /book/i })).toBeInTheDocument();
  });

  it("calls onBook with call id when Book clicked", async () => {
    const onBook = vi.fn();
    render(<LiveCallCard call={endedCall} restaurant={restaurant} onBook={onBook} />);
    await userEvent.click(screen.getByRole("button", { name: /book/i }));
    expect(onBook).toHaveBeenCalledWith("c1");
  });

  it("does not show Book button for skip recommendation", () => {
    const skip = { ...endedCall, recommendation: "skip" as const };
    render(<LiveCallCard call={skip} restaurant={restaurant} onBook={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /book/i })).not.toBeInTheDocument();
  });
});

// ── Taste match highlight ─────────────────────────────────────────────────────

describe("LiveCallCard — taste match", () => {
  it("shows 'Matches your taste' badge when tasteScore >= 2", () => {
    render(<LiveCallCard call={endedCall} restaurant={restaurant} tasteScore={2} />);
    expect(screen.getByText("Matches your taste")).toBeInTheDocument();
  });

  it("does not show taste badge when tasteScore < 2", () => {
    render(<LiveCallCard call={endedCall} restaurant={restaurant} tasteScore={1} />);
    expect(screen.queryByText("Matches your taste")).not.toBeInTheDocument();
  });
});

// ── Non-ended terminal states ─────────────────────────────────────────────────

describe("LiveCallCard — terminal non-ended states", () => {
  it("shows fallback message and links for no_answer", () => {
    render(<LiveCallCard call={{ ...baseCall, status: "no_answer" }} restaurant={restaurant} />);
    expect(screen.getByText(/no one picked up/i)).toBeInTheDocument();
  });

  it("shows fallback message for voicemail", () => {
    render(<LiveCallCard call={{ ...baseCall, status: "voicemail" }} restaurant={restaurant} />);
    expect(screen.getByText(/went to voicemail/i)).toBeInTheDocument();
  });

  it("shows fallback message for failed", () => {
    render(<LiveCallCard call={{ ...baseCall, status: "failed" }} restaurant={restaurant} />);
    expect(screen.getByText(/call failed/i)).toBeInTheDocument();
  });
});

// ── Cuisine display ───────────────────────────────────────────────────────────

describe("LiveCallCard — restaurant metadata", () => {
  it("shows cuisine when no photo", () => {
    render(<LiveCallCard call={baseCall} restaurant={restaurant} />);
    expect(screen.getByText("Bakery")).toBeInTheDocument();
  });
});

// ── Loading/analyzing state ───────────────────────────────────────────────────

describe("LiveCallCard — analyzing state", () => {
  it("shows analyzing spinner when ended but no recommendation yet", () => {
    render(<LiveCallCard call={{ ...baseCall, status: "ended", recommendation: null }} restaurant={restaurant} />);
    expect(screen.getByText(/analyzing transcript/i)).toBeInTheDocument();
  });
});
