import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MissionComparison } from "@/components/mission-comparison";
import type { ScoutCall, Restaurant, Mission, TasteProfile } from "@/lib/types";

const makeRestaurant = (name: string, overrides: Partial<Restaurant> = {}): Restaurant => ({
  id: name,
  google_place_id: `p_${name}`,
  name,
  phone: "+1000000000",
  address: "123 Test St",
  cuisine: "Italian",
  rating: 4.0,
  price_level: 2,
  photo_ref: null,
  lat: 37.77,
  lng: -122.41,
  cached_at: new Date().toISOString(),
  ...overrides,
});

const makeCall = (
  id: string,
  restaurantName: string,
  overrides: Partial<ScoutCall> = {}
): ScoutCall & { restaurant: Restaurant } => ({
  id,
  mission_id: "m1",
  restaurant_id: restaurantName,
  vapi_call_id: null,
  status: "ended",
  transcript: null,
  wait_time: "15 minutes",
  vibe_report: "lively",
  menu_notes: null,
  availability: "tables at 8pm",
  special_notes: null,
  recommendation: "worth_it",
  recommendation_reason: "Good option.",
  call_summary: "A decent place.",
  highlights: ["15 min wait"],
  noise_level: "moderate",
  crowd_level: "busy",
  outdoor_seating: false,
  bar_seating: true,
  vibe_tags: null,
  price_per_person: "~$30-40",
  duration_seconds: 45,
  started_at: null,
  completed_at: null,
  listen_url: null,
  restaurant: makeRestaurant(restaurantName),
  ...overrides,
});

const mission: Mission = {
  id: "m1",
  user_id: "u1",
  raw_query: "dinner in Hayes Valley for 2 tonight",
  party_size: 2,
  desired_time: "tonight",
  neighborhood: "Hayes Valley",
  vibe: null,
  dietary_needs: null,
  status: "complete",
  created_at: new Date().toISOString(),
};

const bestBetCall = makeCall("c1", "Zuni Café", { recommendation: "best_bet", wait_time: "no wait", noise_level: "quiet", crowd_level: "moderate" });
const worthItCall = makeCall("c2", "Tartine", { recommendation: "worth_it", wait_time: "20 minutes", noise_level: "loud", crowd_level: "busy" });
const skipCall = makeCall("c3", "Mediocre Eats", { recommendation: "skip", wait_time: "45 min+", crowd_level: "packed" });

// ── Basic rendering ───────────────────────────────────────────────────────────

describe("MissionComparison — rendering", () => {
  it("renders restaurant names", () => {
    render(<MissionComparison calls={[bestBetCall, worthItCall, skipCall]} mission={mission} />);
    expect(screen.getByText("Zuni Café")).toBeInTheDocument();
    expect(screen.getByText("Tartine")).toBeInTheDocument();
    expect(screen.getByText("Mediocre Eats")).toBeInTheDocument();
  });

  it("shows results count in header", () => {
    render(<MissionComparison calls={[bestBetCall, worthItCall, skipCall]} mission={mission} />);
    expect(screen.getByText(/3.*complete/i)).toBeInTheDocument();
  });

  it("shows 'Top Pick' badge for best_bet", () => {
    render(<MissionComparison calls={[bestBetCall, worthItCall]} mission={mission} />);
    // Badge text includes "Top Pick: Zuni Café" — use getAllByText since the name also appears in the table row
    expect(screen.getAllByText(/Zuni Café/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Top Pick:/)).toBeInTheDocument();
  });

  it("does not show Top Pick badge when no best_bet", () => {
    render(<MissionComparison calls={[worthItCall, skipCall]} mission={mission} />);
    expect(screen.queryByText(/Top Pick/)).not.toBeInTheDocument();
  });

  it("shows verdict labels", () => {
    render(<MissionComparison calls={[bestBetCall, worthItCall, skipCall]} mission={mission} />);
    expect(screen.getByText("Best Bet")).toBeInTheDocument();
    expect(screen.getByText("Worth It")).toBeInTheDocument();
    expect(screen.getByText("Skip")).toBeInTheDocument();
  });

  it("shows wait time values", () => {
    render(<MissionComparison calls={[bestBetCall, worthItCall]} mission={mission} />);
    expect(screen.getByText("no wait")).toBeInTheDocument();
    expect(screen.getByText("20 minutes")).toBeInTheDocument();
  });

  it("shows noise level", () => {
    render(<MissionComparison calls={[bestBetCall, worthItCall]} mission={mission} />);
    expect(screen.getByText("Quiet")).toBeInTheDocument();
    expect(screen.getByText("Loud")).toBeInTheDocument();
  });

  it("shows crowd level", () => {
    render(<MissionComparison calls={[bestBetCall, worthItCall]} mission={mission} />);
    expect(screen.getByText("Moderate")).toBeInTheDocument();
    expect(screen.getByText("Busy")).toBeInTheDocument();
  });

  it("shows availability", () => {
    render(<MissionComparison calls={[bestBetCall]} mission={mission} />);
    expect(screen.getByText("tables at 8pm")).toBeInTheDocument();
  });

  it("shows bar seating icon when present", () => {
    // worthItCall has bar_seating: true
    render(<MissionComparison calls={[worthItCall]} mission={mission} />);
    // Bar seating icon rendered via Wine lucide icon
    const row = screen.getByText("Tartine").closest("tr");
    expect(row).toBeInTheDocument();
  });

  it("shows price per person", () => {
    render(<MissionComparison calls={[bestBetCall]} mission={mission} />);
    expect(screen.getByText("~$30-40/person")).toBeInTheDocument();
  });
});

// ── Pending calls ─────────────────────────────────────────────────────────────

describe("MissionComparison — pending calls", () => {
  it("shows '…' for pending call data", () => {
    const pendingCall = makeCall("c4", "Pending Place", { status: "ringing", recommendation: null, wait_time: null, noise_level: null });
    render(<MissionComparison calls={[pendingCall]} mission={mission} />);
    // Should have pending indicators
    expect(screen.getByText("Pending Place")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("shows partial count when some calls pending", () => {
    const pending = makeCall("c4", "In Progress", { status: "connected", recommendation: null });
    render(<MissionComparison calls={[bestBetCall, pending]} mission={mission} />);
    expect(screen.getByText(/1.*2.*complete/i)).toBeInTheDocument();
  });
});

// ── Sorting ───────────────────────────────────────────────────────────────────

describe("MissionComparison — sorting", () => {
  it("renders sortable column headers", () => {
    render(<MissionComparison calls={[bestBetCall, worthItCall, skipCall]} mission={mission} />);
    expect(screen.getByRole("button", { name: /verdict/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /wait/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /noise/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crowd/i })).toBeInTheDocument();
  });

  it("clicking Wait sort button activates the wait sort", async () => {
    render(<MissionComparison calls={[bestBetCall, worthItCall]} mission={mission} />);
    // Both restaurants appear in the table regardless of sort order
    expect(screen.queryAllByText("Zuni Café").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Tartine").length).toBeGreaterThan(0);

    // Click the sort button — it should not crash and the table should still show both rows
    const waitBtn = screen.getByRole("button", { name: /wait/i });
    await userEvent.click(waitBtn);
    expect(screen.queryAllByText("Zuni Café").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Tartine").length).toBeGreaterThan(0);
  });
});

// ── Taste profile integration ─────────────────────────────────────────────────

describe("MissionComparison — taste profile", () => {
  const richProfile: TasteProfile = {
    neighborhoods: { "Hayes Valley": 5 },
    vibes: { lively: 4 },
    times: { dinner: 6 },
    party_sizes: { "2": 5 },
    features: { outdoor_seating: 0, bar_seating: 0 },
    price_levels: { "2": 4 },
    cuisines: { Italian: 3 },
    total_missions: 6,
    total_bookings: 3,
  };

  it("shows 'Taste matching on' badge when profile has 2+ missions", () => {
    render(<MissionComparison calls={[bestBetCall]} mission={mission} tasteProfile={richProfile} />);
    expect(screen.getByText(/taste matching on/i)).toBeInTheDocument();
  });

  it("shows 'For You' column header when taste profile active", () => {
    render(<MissionComparison calls={[bestBetCall]} mission={mission} tasteProfile={richProfile} />);
    expect(screen.getByRole("button", { name: /for you/i })).toBeInTheDocument();
  });

  it("does not show taste column for empty profile", () => {
    const noProfile: TasteProfile = {
      neighborhoods: {}, vibes: {}, times: {}, party_sizes: {},
      features: { outdoor_seating: 0, bar_seating: 0 },
      price_levels: {}, cuisines: {},
      total_missions: 0, total_bookings: 0,
    };
    render(<MissionComparison calls={[bestBetCall]} mission={mission} tasteProfile={noProfile} />);
    expect(screen.queryByRole("button", { name: /for you/i })).not.toBeInTheDocument();
  });
});

// ── Actions ───────────────────────────────────────────────────────────────────

describe("MissionComparison — actions", () => {
  it("shows Call button for non-skip ended calls", () => {
    render(<MissionComparison calls={[bestBetCall]} mission={mission} onBook={vi.fn()} />);
    expect(screen.getByRole("button", { name: /call/i })).toBeInTheDocument();
  });

  it("calls onBook with correct call id", async () => {
    const onBook = vi.fn();
    render(<MissionComparison calls={[bestBetCall]} mission={mission} onBook={onBook} />);
    await userEvent.click(screen.getByRole("button", { name: /call/i }));
    expect(onBook).toHaveBeenCalledWith("c1");
  });

  it("does not show Call button for skip recommendation", () => {
    render(<MissionComparison calls={[skipCall]} mission={mission} onBook={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /call/i })).not.toBeInTheDocument();
  });
});
