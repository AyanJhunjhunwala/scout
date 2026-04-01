import { describe, it, expect } from "vitest";
import { getNeighborhoodSuggestions } from "@/lib/sf-neighborhoods";

describe("getNeighborhoodSuggestions", () => {
  it("returns up to 8 suggestions for empty query", () => {
    const s = getNeighborhoodSuggestions("");
    expect(s.length).toBeGreaterThan(0);
    expect(s.length).toBeLessThanOrEqual(8);
  });

  it("filters by query substring", () => {
    const s = getNeighborhoodSuggestions("Beach");
    expect(s.length).toBeGreaterThan(0);
    expect(s.every((n) => n.toLowerCase().includes("beach"))).toBe(true);
  });

  it("returns empty array for unrecognized query", () => {
    const s = getNeighborhoodSuggestions("zzz_no_match_xyz");
    expect(s).toHaveLength(0);
  });

  it("returns at most 6 results for a non-empty query", () => {
    const s = getNeighborhoodSuggestions("a");
    expect(s.length).toBeLessThanOrEqual(6);
  });
});
