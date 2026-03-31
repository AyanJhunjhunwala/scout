# Scout

AI voice agent that calls SF restaurants for you — gets wait times, vibe, and availability in real time, then lets you book via OpenTable or a follow-up call.

## Quick Start

```bash
git clone https://github.com/AyanJhunjhunwala/scout.git && cd scout
npm install
cp .env.example .env.local   # fill in keys (Vapi, Google Places, Supabase, Gemini)
# run supabase/migrations/001_initial_schema.sql in Supabase SQL editor
npm run dev                   # localhost:3000
```

Set your Vapi webhook to `https://<your-domain>/api/webhooks/vapi` (use ngrok for local dev).

## Project Structure

- **`app/page.tsx`** — animated landing page with conversational search input
- **`app/dashboard/scout/`** — chat-style mission builder (NLP parses neighborhood, party size, time)
- **`app/dashboard/mission/[id]/`** — live dashboard: call cards, transcripts, audio feed, comparison grid
- **`app/api/`** — Next.js route handlers: mission CRUD, Vapi webhooks, OpenTable links, call sync, photo proxy
- **`lib/`** — core logic: Vapi call orchestration, Google Places search, Gemini transcript extraction, OpenTable URL builder, local NLP parser, SF neighborhood validation
- **`components/`** — `LiveCallCard` (real-time status + audio), `MissionComparison` (ranked table with OpenTable/book buttons), `RestaurantPicker`, `LiveAudioPlayer`

## Technical Choices

- **Next.js 14 App Router** — server components for API routes, client components for real-time UI
- **Vapi.ai** — outbound calls with live WebSocket transcripts and PCM audio streaming
- **Google Gemini** — structured transcript extraction with regex fallback for resilience
- **Supabase** — Postgres + Realtime subscriptions for live dashboard updates
- **OpenTable** — deep-link integration for one-click reservations (search URL with pre-filled covers/datetime)
- **Hybrid NLP** — local regex parser handles common queries instantly; Gemini only called for ambiguous input
