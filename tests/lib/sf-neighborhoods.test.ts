import { describe, it, expect } from "vitest";
import { isInBayArea, getRandomRejection, getNeighborhoodSuggestions } from "@/lib/sf-neighborhoods";

describe("isInBayArea", () => {
  it("accepts SF neighborhoods", () => {
    expect(isInBayArea("Hayes Valley")).toBe(true);
    expect(isInBayArea("Mission District")).toBe(true);
    expect(isInBayArea("North Beach")).toBe(true);
    expect(isInBayArea("Castro")).toBe(true);
    expect(isInBayArea("SoMa")).toBe(true);
    expect(isInBayArea("Nob Hill")).toBe(true);
  });

  it("accepts Bay Area cities", () => {
    expect(isInBayArea("Oakland")).toBe(true);
    expect(isInBayArea("Berkeley")).toBe(true);
    expect(isInBayArea("Palo Alto")).toBe(true);
    expect(isInBayArea("San Francisco")).toBe(true);
    expect(isInBayArea("SF")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isInBayArea("hayes valley")).toBe(true);
    expect(isInBayArea("NORTH BEACH")).toBe(true);
    expect(isInBayArea("Oakland")).toBe(true);
  });

  it("rejects non-Bay Area locations", () => {
    expect(isInBayArea("Los Angeles")).toBe(false);
    expect(isInBayArea("New York")).toBe(false);
    expect(isInBayArea("Chicago")).toBe(false);
    expect(isInBayArea("Seattle")).toBe(false);
    expect(isInBayArea("Miami")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isInBayArea("")).toBe(false);
  });

  it("accepts SF zip codes in address strings", () => {
    expect(isInBayArea("123 Main St, San Francisco, CA 94110")).toBe(true);
  });
});

describe("getRandomRejection", () => {
  it("returns a non-empty string", () => {
    const msg = getRandomRejection();
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(10);
  });

  it("returns different messages on repeated calls (probabilistic)", () => {
    const results = new Set(Array.from({ length: 20 }, () => getRandomRejection()));
    expect(results.size).toBeGreaterThan(1);
  });
});

describe("getNeighborhoodSuggestions", () => {
  it("returns up to 8 suggestions for empty query", () => {
    const s = getNeighborhoodSuggestions("");
    expect(s.length).toBeGreaterThan(0);
    expect(s.length).toBeLessThanOrEqual(8);
  });

  it("filters by query substring", () => {
    const s = getNeighborhoodSuggestions("Beach");
    expect(s.every((n) => n.toLowerCase().includes("beach"))).toBe(true);
  });

  it("returns empty array for unrecognized query", () => {
    const s = getNeighborhoodSuggestions("zzz_no_match_xyz");
    expect(s).toHaveLength(0);
  });

  it("returns at most 6 results", () => {
    const s = getNeighborhoodSuggestions("a");
    expect(s.length).toBeLessThanOrEqual(6);
  });
});
