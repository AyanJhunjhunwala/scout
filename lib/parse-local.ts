export interface ParseResult {
  neighborhood: string | null;
  party_size: number | null;
  desired_time: string | null;
  vibe: string | null;
  dietary_needs: string[] | null;
  ready: boolean;
  questions: string[];
}

// Words that should not be treated as part of a neighborhood name
const LOCATION_STOP_WORDS = new Set([
  "the", "a", "an", "for", "with", "of", "and", "or", "to", "on",
  "tonight", "today", "tomorrow", "evening", "morning", "afternoon", "night",
  "dinner", "lunch", "brunch", "breakfast", "late",
  "my", "me", "i", "us", "we", "spot", "place", "restaurant", "bar", "cafe",
  "group", "party", "people", "friends", "person", "guests", "solo",
  "some", "good", "great", "nice", "cozy", "casual", "chill",
  "around", "about", "hour", "time", "area",
]);

const VIBE_WORDS: Record<string, string> = {
  chill: "chill",
  casual: "casual",
  romantic: "romantic",
  lively: "lively",
  upscale: "upscale",
  fancy: "upscale",
  cozy: "cozy",
  fun: "fun",
  quiet: "quiet",
  loud: "lively",
  trendy: "trendy",
  hip: "trendy",
  "date night": "romantic",
  intimate: "romantic",
  energetic: "lively",
  vibrant: "lively",
  relaxed: "chill",
  "laid back": "chill",
  "laid-back": "chill",
  classy: "upscale",
  bougie: "upscale",
};

const DIETARY_WORDS = [
  "vegetarian",
  "vegan",
  "gluten-free",
  "gluten free",
  "halal",
  "kosher",
  "dairy-free",
  "dairy free",
  "nut-free",
  "nut free",
  "pescatarian",
  "keto",
  "paleo",
];

function collectPlaceWords(words: string[], text: string, lower: string): string | null {
  const placeWords: string[] = [];
  for (const word of words) {
    if (LOCATION_STOP_WORDS.has(word) || /^\d/.test(word)) break;
    placeWords.push(word);
  }
  if (placeWords.length === 0) return null;

  // Recover original casing from the source text
  const joined = placeWords.join(" ");
  const srcIdx = lower.indexOf(joined);
  const original = srcIdx >= 0 ? text.slice(srcIdx, srcIdx + joined.length) : joined;

  // Title-case if entirely lowercase
  return original === original.toLowerCase()
    ? original.replace(/\b\w/g, (c) => c.toUpperCase())
    : original;
}

function extractNeighborhood(text: string): string | null {
  const lower = text.toLowerCase();

  // Primary: location after "in [the] X", "near X", "at X", "around X"
  const prepMatch = lower.match(/\b(?:in|near|at|around)\s+(?:the\s+)?([a-z][\w -]{1,40})/);
  if (prepMatch) {
    const words = prepMatch[1].trim().split(/\s+/);
    const result = collectPlaceWords(words, text, lower);
    if (result) return result;
  }

  // Fallback: capitalized word(s) at the start of each sentence
  // Handles direct answers like "Hayes Valley, for 4" or follow-up messages like
  // "I want dinner. Hayes Valley for 4 at 8pm"
  for (const sentence of text.split(/[.!?]\s+/)) {
    const capMatch = sentence.match(/^(?:the\s+)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/);
    if (capMatch) {
      const words = capMatch[1].split(/\s+/).map((w) => w.toLowerCase());
      const result = collectPlaceWords(words, text, lower);
      if (result) return result;
    }
  }

  return null;
}

function extractPartySize(text: string): number | null {
  const patterns = [
    /(?:for|party\s+of|table\s+for|group\s+of)\s+(\d+)/i,
    /(\d+)\s+(?:people|friends|guests|persons|of us|ppl)/i,
    /(?:just\s+)?(\d+)\s+(?:of\s+us|tonight)/i,
    /\b(two|three|four|five|six|seven|eight)\b/i,
  ];

  const wordToNum: Record<string, number> = {
    two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  };

  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      const val = m[1];
      if (wordToNum[val.toLowerCase()]) return wordToNum[val.toLowerCase()];
      const n = parseInt(val, 10);
      if (!isNaN(n) && n >= 1 && n <= 30) return n;
    }
  }

  // "solo" or "just me"
  if (/\b(solo|just me|myself)\b/i.test(text)) return 1;
  // "date" implies 2
  if (/\bdate\b/i.test(text)) return 2;

  return null;
}

function extractTime(text: string): string | null {
  const lower = text.toLowerCase();

  // Natural phrases first (most common)
  if (/\btonight\b/i.test(lower)) return "tonight";
  if (/\btomorrow\b/i.test(lower)) return "tomorrow evening";
  if (/\blunch\b/i.test(lower)) return "lunch today";
  if (/\bbrunch\b/i.test(lower)) return "brunch";
  if (/\bthis evening\b/i.test(lower)) return "this evening";
  if (/\blast.?minute\b/i.test(lower)) return "tonight";
  if (/\bright now\b/i.test(lower)) return "right now";
  if (/\bweekend\b/i.test(lower)) return "this weekend";
  if (/\bfriday\b/i.test(lower)) return "Friday evening";
  if (/\bsaturday\b/i.test(lower)) return "Saturday evening";
  if (/\bsunday\b/i.test(lower)) return "Sunday";

  // "around X" or "at X" with a number
  const aroundMatch = text.match(/(?:around|at|by)\s+(\d{1,2}(?::\d{2})?(?:\s*(?:pm|am))?)\b/i);
  if (aroundMatch) return `around ${aroundMatch[1].replace(/\s+/g, "")}`;

  // Specific times: must have am/pm or colon (to avoid matching bare party-size numbers)
  const timeWithSuffix = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:pm|am))\b/i);
  if (timeWithSuffix) return timeWithSuffix[1].replace(/\s+/g, "");

  const timeWithColon = text.match(/\b(\d{1,2}:\d{2})\b/);
  if (timeWithColon) return timeWithColon[1];

  // "dinner" implies tonight (checked after specific times so "dinner at 8pm" gets the 8pm)
  if (/\bdinner\b/i.test(lower)) return "tonight";

  return null;
}

function extractVibe(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [keyword, vibe] of Object.entries(VIBE_WORDS)) {
    if (lower.includes(keyword)) return vibe;
  }
  return null;
}

function extractDietary(text: string): string[] | null {
  const lower = text.toLowerCase();
  const found = DIETARY_WORDS.filter((d) => lower.includes(d));
  return found.length > 0 ? found : null;
}

export function parseLocally(allUserText: string, existing?: Partial<ParseResult>): ParseResult {
  const neighborhood = extractNeighborhood(allUserText) || existing?.neighborhood || null;
  const party_size = extractPartySize(allUserText) ?? existing?.party_size ?? null;
  const desired_time = extractTime(allUserText) || existing?.desired_time || null;
  const vibe = extractVibe(allUserText) || existing?.vibe || null;
  const dietary_needs = extractDietary(allUserText) || existing?.dietary_needs || null;

  const ready = !!(neighborhood && party_size && desired_time);

  const questions: string[] = [];
  if (!ready) {
    if (!neighborhood) questions.push("Which SF neighborhood are you thinking?");
    if (!party_size) questions.push("How many people?");
    if (!desired_time && questions.length < 2) questions.push("What time?");
  }

  return { neighborhood, party_size, desired_time, vibe, dietary_needs, ready, questions };
}
