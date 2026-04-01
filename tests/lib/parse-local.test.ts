import { describe, it, expect } from "vitest";
import { parseLocally } from "@/lib/parse-local";

describe("parseLocally — neighborhood extraction", () => {
  it("extracts Hayes Valley", () => {
    const r = parseLocally("dinner in Hayes Valley for 2 tonight");
    expect(r.neighborhood).toBe("Hayes Valley");
  });

  it("extracts Mission District", () => {
    const r = parseLocally("lively spot in the Mission District, 4 people, 9pm");
    expect(r.neighborhood).toBe("Mission District");
  });

  it("extracts North Beach", () => {
    const r = parseLocally("romantic dinner in North Beach for 2");
    expect(r.neighborhood).toBe("North Beach");
  });

  it("extracts Castro (the Castro → The Castro)", () => {
    const r = parseLocally("casual tacos in the Castro for 3 tonight");
    // "The Castro" is longer than "Castro" and matches first per length-sorted list
    expect(r.neighborhood).toBe("The Castro");
  });

  it("extracts Marina (Bay Area city)", () => {
    const r = parseLocally("brunch in Marina for 4 on Sunday");
    expect(r.neighborhood).toBe("Marina");
  });

  it("returns null when no neighborhood mentioned", () => {
    const r = parseLocally("dinner for 2 tonight");
    expect(r.neighborhood).toBeNull();
  });

  it("uses existing neighborhood if not found in new text", () => {
    const r = parseLocally("make it for 4 actually", { neighborhood: "Hayes Valley" });
    expect(r.neighborhood).toBe("Hayes Valley");
  });

  it("prefers longer neighborhood match (Hayes Valley over Hayes)", () => {
    const r = parseLocally("dinner in Hayes Valley");
    expect(r.neighborhood).toBe("Hayes Valley");
  });
});

describe("parseLocally — party size extraction", () => {
  it("extracts 'for 2'", () => {
    expect(parseLocally("dinner for 2 tonight").party_size).toBe(2);
  });

  it("extracts 'party of 4'", () => {
    expect(parseLocally("party of 4 in Hayes Valley tonight").party_size).toBe(4);
  });

  it("extracts '6 people'", () => {
    expect(parseLocally("6 people in the Mission tonight").party_size).toBe(6);
  });

  it("extracts word number 'three'", () => {
    expect(parseLocally("going with three friends in North Beach tonight").party_size).toBe(3);
  });

  it("extracts 'solo'", () => {
    expect(parseLocally("solo dinner in Noe Valley tonight").party_size).toBe(1);
  });

  it("extracts 'date' as 2", () => {
    expect(parseLocally("date night in North Beach tonight").party_size).toBe(2);
  });

  it("returns null when no size mentioned", () => {
    expect(parseLocally("dinner in Hayes Valley tonight").party_size).toBeNull();
  });

  it("uses existing party_size if not found in new text", () => {
    expect(parseLocally("make it tonight", { party_size: 3 }).party_size).toBe(3);
  });
});

describe("parseLocally — time extraction", () => {
  it("extracts 'tonight'", () => {
    expect(parseLocally("dinner in Hayes Valley for 2 tonight").desired_time).toBe("tonight");
  });

  it("extracts 'lunch'", () => {
    expect(parseLocally("lunch in the Mission for 2").desired_time).toBe("lunch today");
  });

  it("extracts 'brunch'", () => {
    expect(parseLocally("brunch in Marina for 4 on Sunday").desired_time).toBe("brunch");
  });

  it("extracts 'tomorrow'", () => {
    expect(parseLocally("dinner in Hayes Valley for 2 tomorrow").desired_time).toBe("tomorrow evening");
  });

  it("extracts specific time with pm (prefixed with 'around' from 'at X' pattern)", () => {
    // "at 7:30pm" triggers the aroundMatch pattern → "around 7:30pm"
    expect(parseLocally("dinner in North Beach for 2 at 7:30pm").desired_time).toBe("around 7:30pm");
  });

  it("extracts time with colon", () => {
    expect(parseLocally("dinner in Hayes Valley for 2 at 8:00").desired_time).toBe("around 8:00");
  });

  it("maps 'dinner' alone to tonight", () => {
    expect(parseLocally("dinner in Hayes Valley for 2").desired_time).toBe("tonight");
  });

  it("returns null when no time mentioned", () => {
    expect(parseLocally("restaurant in Hayes Valley for 2").desired_time).toBeNull();
  });
});

describe("parseLocally — vibe extraction", () => {
  it("extracts 'romantic'", () => {
    expect(parseLocally("romantic dinner in North Beach for 2 tonight").vibe).toBe("romantic");
  });

  it("maps 'fancy' to 'upscale'", () => {
    expect(parseLocally("fancy dinner in Hayes Valley for 2 tonight").vibe).toBe("upscale");
  });

  it("maps 'intimate' to 'romantic'", () => {
    expect(parseLocally("intimate spot in North Beach for 2 tonight").vibe).toBe("romantic");
  });

  it("maps 'laid back' to 'chill'", () => {
    expect(parseLocally("laid back spot in the Mission for 2 tonight").vibe).toBe("chill");
  });

  it("maps 'loud' to 'lively'", () => {
    expect(parseLocally("loud bar in SoMa for 4 tonight").vibe).toBe("lively");
  });

  it("maps 'bougie' to 'upscale'", () => {
    expect(parseLocally("bougie restaurant in Pacific Heights for 2 tonight").vibe).toBe("upscale");
  });

  it("returns null when no vibe mentioned", () => {
    expect(parseLocally("dinner in Hayes Valley for 2 tonight").vibe).toBeNull();
  });
});

describe("parseLocally — dietary extraction", () => {
  it("extracts vegetarian", () => {
    const r = parseLocally("I need vegetarian options in Hayes Valley for 2 tonight");
    expect(r.dietary_needs).toContain("vegetarian");
  });

  it("extracts gluten-free", () => {
    const r = parseLocally("gluten-free options in the Mission for 2 tonight");
    expect(r.dietary_needs).toContain("gluten-free");
  });

  it("extracts multiple dietary needs", () => {
    const r = parseLocally("vegan and gluten free dinner in Hayes Valley for 2 tonight");
    expect(r.dietary_needs).toContain("vegan");
    expect(r.dietary_needs).toContain("gluten free");
  });

  it("returns null when no dietary needs", () => {
    expect(parseLocally("dinner in Hayes Valley for 2 tonight").dietary_needs).toBeNull();
  });
});

describe("parseLocally — ready flag and questions", () => {
  it("ready=true when neighborhood, party_size, and desired_time are all set", () => {
    const r = parseLocally("dinner in Hayes Valley for 2 tonight");
    expect(r.ready).toBe(true);
    expect(r.questions).toHaveLength(0);
  });

  it("ready=false when neighborhood is missing", () => {
    const r = parseLocally("dinner for 2 tonight");
    expect(r.ready).toBe(false);
    expect(r.questions.some((q) => q.toLowerCase().includes("neighborhood"))).toBe(true);
  });

  it("ready=false when party_size is missing", () => {
    const r = parseLocally("dinner in Hayes Valley tonight");
    expect(r.ready).toBe(false);
    expect(r.questions.some((q) => q.toLowerCase().includes("how many") || q.toLowerCase().includes("people"))).toBe(true);
  });

  it("ready=false when desired_time is missing", () => {
    const r = parseLocally("restaurant in Hayes Valley for 2");
    expect(r.ready).toBe(false);
    expect(r.questions.length).toBeGreaterThan(0);
  });

  it("does not generate more than 2 questions", () => {
    const r = parseLocally("I want food");
    expect(r.questions.length).toBeLessThanOrEqual(2);
  });

  it("uses existing accumulated fields", () => {
    const r = parseLocally("make it tonight", { neighborhood: "Hayes Valley", party_size: 3 });
    expect(r.ready).toBe(true);
    expect(r.neighborhood).toBe("Hayes Valley");
    expect(r.party_size).toBe(3);
  });
});
