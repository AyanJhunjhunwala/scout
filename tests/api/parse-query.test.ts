import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @google/generative-ai so the route falls back to local parsing in tests
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockRejectedValue(new Error("Gemini mocked out")),
    }),
  })),
}));

// Import after mock is set up
const { POST } = await import("@/app/api/parse-query/route");

function makeRequest(body: object) {
  return new Request("http://localhost/api/parse-query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/parse-query", () => {
  it("returns 400 when messages is missing", async () => {
    const req = makeRequest({});
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when messages is empty", async () => {
    const req = makeRequest({ messages: [] });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns ready=true for a complete query", async () => {
    const req = makeRequest({
      messages: [{ role: "user", text: "dinner in Hayes Valley for 2 tonight" }],
    });
    const res = await POST(req as never);
    const data = await res.json();
    expect(data.ready).toBe(true);
    expect(data.neighborhood).toBe("Hayes Valley");
    expect(data.party_size).toBe(2);
    expect(data.desired_time).toBe("tonight");
  });

  it("returns ready=false and questions when neighborhood missing", async () => {
    const req = makeRequest({
      messages: [{ role: "user", text: "dinner for 2 tonight" }],
    });
    const res = await POST(req as never);
    const data = await res.json();
    expect(data.ready).toBe(false);
    expect(data.questions.length).toBeGreaterThan(0);
  });

  it("returns ready=false and questions when party_size missing", async () => {
    const req = makeRequest({
      messages: [{ role: "user", text: "dinner in Hayes Valley tonight" }],
    });
    const res = await POST(req as never);
    const data = await res.json();
    expect(data.ready).toBe(false);
    expect(data.questions.some((q: string) => q.toLowerCase().includes("how many") || q.toLowerCase().includes("people"))).toBe(true);
  });

  it("extracts vibe from message", async () => {
    const req = makeRequest({
      messages: [{ role: "user", text: "romantic dinner in North Beach for 2 tonight" }],
    });
    const res = await POST(req as never);
    const data = await res.json();
    expect(data.vibe).toBe("romantic");
  });

  it("extracts dietary needs", async () => {
    const req = makeRequest({
      messages: [{ role: "user", text: "vegan dinner in Hayes Valley for 2 tonight" }],
    });
    const res = await POST(req as never);
    const data = await res.json();
    expect(data.dietary_needs).toContain("vegan");
  });

  it("merges accumulated context with new message", async () => {
    const req = makeRequest({
      messages: [{ role: "user", text: "make it tonight" }],
      accumulated: { neighborhood: "Hayes Valley", party_size: 3 },
    });
    const res = await POST(req as never);
    const data = await res.json();
    expect(data.ready).toBe(true);
    expect(data.neighborhood).toBe("Hayes Valley");
    expect(data.party_size).toBe(3);
  });

  it("does not exceed 2 questions", async () => {
    const req = makeRequest({
      messages: [{ role: "user", text: "food please" }],
    });
    const res = await POST(req as never);
    const data = await res.json();
    expect(data.questions.length).toBeLessThanOrEqual(2);
  });

  it("handles multi-message conversation", async () => {
    const req = makeRequest({
      messages: [
        { role: "user", text: "I want dinner" },
        { role: "scout", text: "Which SF neighborhood?" },
        { role: "user", text: "Hayes Valley, for 4 people at 8pm" },
      ],
    });
    const res = await POST(req as never);
    const data = await res.json();
    expect(data.neighborhood).toBe("Hayes Valley");
    expect(data.party_size).toBe(4);
  });
});
