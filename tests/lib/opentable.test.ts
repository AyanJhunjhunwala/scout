import { describe, it, expect } from "vitest";
import { buildOpenTableSearchUrl, buildOpenTableDirectUrl } from "@/lib/opentable";
import type { Restaurant, Mission } from "@/lib/types";

const restaurant: Restaurant = {
  id: "r1",
  google_place_id: "place_1",
  name: "Zuni Café",
  phone: "+14155524545",
  address: "1658 Market St, San Francisco, CA",
  cuisine: "American",
  rating: 4.5,
  price_level: 3,
  photo_ref: null,
  lat: 37.7749,
  lng: -122.4194,
  cached_at: new Date().toISOString(),
};

const mission: Mission = {
  id: "m1",
  user_id: "u1",
  raw_query: "dinner in Hayes Valley for 2 tonight",
  party_size: 2,
  desired_time: "tonight",
  neighborhood: "Hayes Valley",
  vibe: "romantic",
  dietary_needs: null,
  status: "complete",
  created_at: new Date().toISOString(),
};

describe("buildOpenTableSearchUrl", () => {
  it("includes base opentable URL", () => {
    const url = buildOpenTableSearchUrl(restaurant, mission);
    expect(url).toContain("opentable.com");
  });

  it("includes the restaurant name as 'term' param", () => {
    const url = buildOpenTableSearchUrl(restaurant, mission);
    expect(url).toContain("term=Zuni+Caf%C3%A9");
  });

  it("includes the party size as 'covers' param", () => {
    const url = buildOpenTableSearchUrl(restaurant, mission);
    expect(url).toContain("covers=2");
  });

  it("includes SF metro id (4)", () => {
    const url = buildOpenTableSearchUrl(restaurant, mission);
    expect(url).toContain("metroId=4");
  });

  it("encodes 'tonight' as a 7pm dateTime", () => {
    const url = buildOpenTableSearchUrl(restaurant, mission);
    expect(url).toContain("T19%3A00");
  });

  it("encodes a specific time like '8:30pm'", () => {
    const m = { ...mission, desired_time: "8:30pm" };
    const url = buildOpenTableSearchUrl(restaurant, m);
    expect(url).toContain("T20%3A30");
  });

  it("encodes 'lunch' as 12pm", () => {
    const m = { ...mission, desired_time: "lunch" };
    const url = buildOpenTableSearchUrl(restaurant, m);
    expect(url).toContain("T12%3A00");
  });

  it("encodes 'brunch' as 11am", () => {
    const m = { ...mission, desired_time: "brunch" };
    const url = buildOpenTableSearchUrl(restaurant, m);
    expect(url).toContain("T11%3A00");
  });
});

describe("buildOpenTableDirectUrl", () => {
  it("converts name to lowercase slug", () => {
    const url = buildOpenTableDirectUrl("Zuni Café");
    expect(url).toContain("zuni-caf");
  });

  it("replaces spaces with hyphens", () => {
    const url = buildOpenTableDirectUrl("The French Laundry");
    expect(url).toContain("the-french-laundry");
  });

  it("removes special characters", () => {
    const url = buildOpenTableDirectUrl("Al's #1 Diner!");
    expect(url).not.toMatch(/[#!]/);
  });

  it("collapses multiple hyphens", () => {
    const url = buildOpenTableDirectUrl("A  B");
    expect(url).not.toContain("--");
  });
});
