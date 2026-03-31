import { NextRequest, NextResponse } from "next/server";
import { parseLocally, type ParseResult } from "@/lib/parse-local";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface ChatMessage {
  role: "user" | "scout";
  text: string;
}

export async function POST(req: NextRequest) {
  const { messages, accumulated } = (await req.json()) as {
    messages: ChatMessage[];
    accumulated?: Partial<ParseResult>;
  };

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const allUserText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.text)
    .join(". ");

  // Local parser first — fast and reliable
  const local = parseLocally(allUserText, accumulated || undefined);

  // If local parser got everything, return immediately (no LLM needed)
  if (local.ready) {
    return NextResponse.json(local);
  }

  // Try Gemini for better natural language understanding
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" },
      });

      const conversationText = messages
        .map((m) => `${m.role === "user" ? "User" : "Scout"}: ${m.text}`)
        .join("\n");

      const prompt = `Extract restaurant search details from this conversation. Return JSON only.

Conversation:
${conversationText}

Already known: ${JSON.stringify({
        neighborhood: local.neighborhood || accumulated?.neighborhood || null,
        party_size: local.party_size ?? accumulated?.party_size ?? null,
        desired_time: local.desired_time || accumulated?.desired_time || null,
        vibe: local.vibe || accumulated?.vibe || null,
      })}

Rules:
- "dinner" or "eat tonight" means desired_time is "tonight"
- "for 2" means party_size is 2
- If ready=true, questions must be empty
- ready=true when neighborhood AND party_size AND desired_time all exist
- Only ask about MISSING fields, max 2 questions. Be brief and casual.

Return: {"neighborhood":string|null,"party_size":number|null,"desired_time":string|null,"vibe":string|null,"dietary_needs":string[]|null,"ready":boolean,"questions":string[]}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const gemini: ParseResult = JSON.parse(text);

      // Merge: prefer non-null values from either source
      const merged: ParseResult = {
        neighborhood: gemini.neighborhood || local.neighborhood,
        party_size: gemini.party_size ?? local.party_size,
        desired_time: gemini.desired_time || local.desired_time,
        vibe: gemini.vibe || local.vibe,
        dietary_needs: gemini.dietary_needs || local.dietary_needs,
        ready: false,
        questions: [],
      };
      merged.ready = !!(merged.neighborhood && merged.party_size && merged.desired_time);

      if (!merged.ready) {
        // Use Gemini's questions if they're about actually missing fields
        const missing: string[] = [];
        if (!merged.neighborhood) missing.push("neighborhood");
        if (!merged.party_size) missing.push("party_size");
        if (!merged.desired_time) missing.push("desired_time");

        if (gemini.questions && gemini.questions.length > 0) {
          merged.questions = gemini.questions.slice(0, 2);
        } else {
          if (!merged.neighborhood) merged.questions.push("Which SF neighborhood?");
          if (!merged.party_size) merged.questions.push("How many people?");
          if (!merged.desired_time && merged.questions.length < 2) merged.questions.push("What time?");
        }
      }

      return NextResponse.json(merged);
    } catch (err) {
      console.error("Gemini enhancement failed, using local parse:", err);
    }
  }

  // Fallback: local result (always returns something sensible)
  return NextResponse.json(local);
}
