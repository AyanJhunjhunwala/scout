import { describe, it, expect } from "vitest";
import { extractFallback } from "@/lib/extract";

describe("extractFallback — wait time", () => {
  it("extracts minute wait time", () => {
    expect(extractFallback("The wait is about 30 minutes right now").wait_time).toBe("30 minutes");
  });

  it("extracts 'no wait'", () => {
    expect(extractFallback("There is no wait right now, come on in").wait_time).toBe("no wait");
  });

  it("extracts 'some wait' from generic wait mention", () => {
    expect(extractFallback("There is a bit of a wait tonight").wait_time).toBe("some wait");
  });

  it("returns null when no wait info", () => {
    expect(extractFallback("Hello, thanks for calling").wait_time).toBeNull();
  });
});

describe("extractFallback — vibe", () => {
  it("detects 'busy'", () => {
    expect(extractFallback("We are very busy tonight, packed house").vibe).toBe("busy");
  });

  it("detects 'quiet'", () => {
    expect(extractFallback("It's a calm quiet night, half empty").vibe).toBe("quiet");
  });

  it("detects 'lively' from 'fun'", () => {
    expect(extractFallback("It's a really fun lively atmosphere tonight").vibe).toBe("lively");
  });

  it("returns null when vibe not mentioned", () => {
    expect(extractFallback("We have tables available at 8pm").vibe).toBeNull();
  });
});

describe("extractFallback — availability", () => {
  it("detects 'fully booked'", () => {
    expect(extractFallback("Sorry, we are fully booked for the evening").availability).toBe("fully booked");
  });

  it("detects 'no tables'", () => {
    expect(extractFallback("We have no tables available tonight").availability).toBe("fully booked");
  });

  it("detects open availability", () => {
    expect(extractFallback("Yes we have tables available at 7 and 8pm").availability).toBe("tables available");
  });

  it("returns null when availability not mentioned", () => {
    expect(extractFallback("Hello, how can I help you?").availability).toBeNull();
  });
});

describe("extractFallback — noise and crowd", () => {
  it("detects 'loud' noise", () => {
    expect(extractFallback("It's quite loud in here tonight").noise_level).toBe("loud");
  });

  it("detects 'quiet' noise", () => {
    expect(extractFallback("The restaurant is peaceful and quiet").noise_level).toBe("quiet");
  });

  it("detects 'packed' crowd", () => {
    expect(extractFallback("We are completely packed right now").crowd_level).toBe("packed");
  });

  it("detects 'empty' crowd", () => {
    expect(extractFallback("It's a slow night, pretty empty in here").crowd_level).toBe("empty");
  });

  it("returns null when noise level not inferable", () => {
    expect(extractFallback("We close at midnight").noise_level).toBeNull();
  });
});

describe("extractFallback — outdoor and bar seating", () => {
  it("detects patio as outdoor seating", () => {
    expect(extractFallback("We have a lovely patio out back").outdoor_seating).toBe(true);
  });

  it("detects 'outdoor' keyword", () => {
    expect(extractFallback("Outdoor seating is available tonight").outdoor_seating).toBe(true);
  });

  it("detects bar seating", () => {
    expect(extractFallback("We have bar seats available right now").bar_seating).toBe(true);
  });

  it("detects bar top", () => {
    expect(extractFallback("There are bar top seats if you want").bar_seating).toBe(true);
  });

  it("returns null when not mentioned", () => {
    expect(extractFallback("We have tables at 7pm").outdoor_seating).toBeNull();
    expect(extractFallback("We have tables at 7pm").bar_seating).toBeNull();
  });
});

describe("extractFallback — vibe tags", () => {
  it("adds 'date-friendly' when date mentioned", () => {
    expect(extractFallback("Perfect for a date night, very romantic").vibe_tags).toContain("date-friendly");
  });

  it("adds 'great for groups' when group mentioned", () => {
    expect(extractFallback("Great for large groups and parties").vibe_tags).toContain("great for groups");
  });

  it("adds 'dog-friendly' when dogs mentioned", () => {
    expect(extractFallback("Yes we are dog friendly on the patio").vibe_tags).toContain("dog-friendly");
  });

  it("adds 'live music' when band mentioned", () => {
    expect(extractFallback("There's a live jazz band tonight").vibe_tags).toContain("live music");
  });

  it("returns null when no tags apply", () => {
    expect(extractFallback("We close at 10pm").vibe_tags).toBeNull();
  });
});

describe("extractFallback — recommendation and summary", () => {
  it("always returns a recommendation", () => {
    expect(extractFallback("Thanks for calling!").recommendation).toBe("worth_it");
  });

  it("always returns a recommendation_reason", () => {
    const r = extractFallback("Hello");
    expect(typeof r.recommendation_reason).toBe("string");
    expect(r.recommendation_reason.length).toBeGreaterThan(0);
  });

  it("includes relevant info in call_summary", () => {
    const r = extractFallback("The wait is about 20 minutes, it's pretty busy tonight");
    expect(r.call_summary).toContain("20 minutes");
  });

  it("always returns at least one highlight when info extracted", () => {
    const r = extractFallback("30 minute wait, no tables but bar seats available");
    expect(r.highlights!.length).toBeGreaterThan(0);
  });

  it("returns fallback highlights array even for no-info transcript", () => {
    const r = extractFallback("Beep boop");
    expect(Array.isArray(r.highlights)).toBe(true);
  });
});
