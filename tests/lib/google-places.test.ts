import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseDesiredTime } from "@/lib/google-places";

// Pin "now" to Wednesday 2026-04-01 at 14:00 local time (day=3, hour=14)
// April 1 2026 is a Wednesday
const FIXED_NOW = new Date("2026-04-01T14:00:00");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("parseDesiredTime", () => {
  it("returns null for unrecognisable input", () => {
    expect(parseDesiredTime("some random string without time")).toBeNull();
  });

  it("parses 'tonight' as Wednesday 19:00", () => {
    const t = parseDesiredTime("tonight");
    expect(t).not.toBeNull();
    expect(t!.day).toBe(3); // Wednesday (Apr 1 2026)
    expect(t!.hhmm).toBe("1900");
  });

  it("parses 'dinner' as 19:00", () => {
    const t = parseDesiredTime("dinner");
    expect(t!.hhmm).toBe("1900");
  });

  it("parses 'lunch today' as 12:00", () => {
    const t = parseDesiredTime("lunch today");
    expect(t!.hhmm).toBe("1200");
  });

  it("parses 'brunch' as 11:00", () => {
    const t = parseDesiredTime("brunch");
    expect(t!.hhmm).toBe("1100");
  });

  it("parses 'late night' as 22:00", () => {
    const t = parseDesiredTime("late night");
    expect(t!.hhmm).toBe("2200");
  });

  it("parses 'tomorrow evening' as Thursday 19:00", () => {
    const t = parseDesiredTime("tomorrow evening");
    expect(t!.day).toBe(4); // Thursday (day after Wednesday)
    expect(t!.hhmm).toBe("1900");
  });

  it("parses 'around 8:30pm' as 20:30", () => {
    const t = parseDesiredTime("around 8:30pm");
    expect(t!.hhmm).toBe("2030");
  });

  it("parses '7pm' as 19:00", () => {
    const t = parseDesiredTime("7pm");
    expect(t!.hhmm).toBe("1900");
  });

  it("parses '7:30pm' as 19:30", () => {
    const t = parseDesiredTime("7:30pm");
    expect(t!.hhmm).toBe("1930");
  });

  it("parses '12pm' (noon) as 12:00", () => {
    const t = parseDesiredTime("12pm");
    expect(t!.hhmm).toBe("1200");
  });

  it("parses '11am' as 11:00", () => {
    const t = parseDesiredTime("11am");
    expect(t!.hhmm).toBe("1100");
  });

  it("treats bare '8' (no am/pm) as PM → 20:00", () => {
    const t = parseDesiredTime("dinner at 8");
    expect(t!.hhmm).toBe("2000");
  });

  it("parses 'Friday evening' as the next Friday (day=5)", () => {
    // FIXED_NOW is Tuesday; next Friday is 3 days away
    const t = parseDesiredTime("Friday evening");
    expect(t!.day).toBe(5);
    expect(t!.hhmm).toBe("1900");
  });

  it("parses 'Saturday' as next Saturday (day=6)", () => {
    const t = parseDesiredTime("Saturday");
    expect(t!.day).toBe(6);
  });
});
