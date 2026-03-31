# Scout

Scout calls restaurants right now so you don't walk into a bad night.

Enter your neighborhood, party size, time, and vibe. Scout calls 3-5 restaurants in parallel with a natural-sounding AI voice agent, gathers real-time intel (wait times, vibe, menu availability), and gives you a ranked comparison — all in under 3 minutes.

## Tech Stack

- **Framework**: Next.js (App Router) with TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Voice Agent**: [Vapi.ai](https://vapi.ai) — outbound calls with real-time transcripts
- **Restaurant Data**: Google Places API
- **Database**: Supabase (Postgres + Realtime subscriptions)
- **LLM**: OpenAI GPT-4o-mini for transcript extraction
- **Deploy**: Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Vapi](https://vapi.ai) account with a phone number
- A [Google Cloud](https://console.cloud.google.com) project with Places API enabled
- An [OpenAI](https://platform.openai.com) API key

### 1. Clone and install

```bash
git clone https://github.com/AyanJhunjhunwala/scout.git
cd scout
npm install
```

### 2. Set up environment variables

Copy the example env file and fill in your keys:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `VAPI_API_KEY` | [Vapi Dashboard](https://dashboard.vapi.ai) → API Keys |
| `VAPI_PHONE_NUMBER_ID` | Vapi Dashboard → Phone Numbers → copy the ID |
| `GOOGLE_PLACES_API_KEY` | Google Cloud Console → APIs & Services → Credentials |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API (service_role) |
| `OPENAI_API_KEY` | [OpenAI Platform](https://platform.openai.com/api-keys) |

### 3. Run the database migration

In the Supabase SQL editor, run the contents of:

```
supabase/migrations/001_initial_schema.sql
```

This creates the `users`, `restaurants`, `missions`, and `scout_calls` tables, plus indexes and realtime subscriptions.

### 4. Configure Vapi webhook

In your Vapi dashboard, set the webhook URL to:

```
https://your-domain.com/api/webhooks/vapi
```

For local development, use a tunnel like [ngrok](https://ngrok.com):

```bash
ngrok http 3000
# Then set webhook to: https://your-ngrok-url.ngrok.io/api/webhooks/vapi
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
scout/
├── app/
│   ├── page.tsx                          # Landing page
│   ├── layout.tsx                        # Root layout
│   ├── dashboard/
│   │   ├── page.tsx                      # Mission history
│   │   ├── layout.tsx                    # Dashboard layout with navbar
│   │   ├── scout/page.tsx                # Scout flow (input → pick → launch)
│   │   └── mission/[id]/page.tsx         # Live mission view + results
│   ├── settings/page.tsx                 # Dietary profile & account
│   └── api/
│       ├── missions/
│       │   ├── create/route.ts           # Search places + create mission
│       │   └── [id]/
│       │       ├── route.ts              # Get mission with calls
│       │       └── launch/route.ts       # Fire parallel Vapi calls
│       ├── webhooks/vapi/route.ts        # Vapi lifecycle events
│       ├── calls/[id]/book/route.ts      # Trigger booking call
│       └── restaurants/search/route.ts   # Standalone place search
├── components/
│   ├── scout-input.tsx                   # Search form
│   ├── restaurant-picker.tsx             # Selectable restaurant cards
│   ├── live-call-card.tsx                # Real-time call status
│   ├── mission-comparison.tsx            # Results comparison table
│   ├── transcript-stream.tsx             # Live transcript display
│   └── navbar.tsx                        # Navigation bar
├── lib/
│   ├── types.ts                          # TypeScript types
│   ├── supabase.ts                       # Supabase client helpers
│   ├── vapi.ts                           # Vapi outbound call functions
│   ├── google-places.ts                  # Google Places API
│   └── extract.ts                        # LLM transcript extraction
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql        # Database schema
```

## How It Works

1. **Search**: User enters neighborhood + preferences → app searches Google Places
2. **Pick**: User selects 3-5 restaurants (or auto-picks top-rated)
3. **Call**: App fires parallel Vapi outbound calls to all selected restaurants
4. **Stream**: Dashboard shows live call status with real-time transcript streaming via Supabase Realtime
5. **Extract**: When each call ends, the Vapi webhook fires → backend extracts structured data (wait time, vibe, menu notes) from the transcript using GPT-4o-mini
6. **Compare**: Results appear in a ranked comparison table with recommendation badges
7. **Book**: User clicks "Book" to trigger a second call that makes the reservation

## API Routes

| Method | Route | Description |
|---|---|---|
| POST | `/api/missions/create` | Search restaurants, create mission |
| GET | `/api/missions/[id]` | Get mission with all scout calls |
| POST | `/api/missions/[id]/launch` | Fire parallel Vapi calls |
| POST | `/api/webhooks/vapi` | Handle Vapi lifecycle events |
| POST | `/api/calls/[id]/book` | Trigger booking call |
| GET | `/api/restaurants/search` | Standalone restaurant search |

## Deploying to Vercel

```bash
npm i -g vercel
vercel
```

Set all env vars in the Vercel dashboard under Settings → Environment Variables.

Update the Vapi webhook URL to your production domain.
