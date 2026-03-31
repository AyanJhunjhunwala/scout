-- Scout initial schema

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  dietary_restrictions text[],
  created_at timestamptz default now()
);

create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  google_place_id text unique not null,
  name text not null,
  phone text not null,
  address text,
  cuisine text,
  rating numeric,
  price_level int,
  photo_ref text,
  lat numeric,
  lng numeric,
  cached_at timestamptz default now()
);

create table if not exists missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  raw_query text,
  party_size int,
  desired_time text,
  neighborhood text,
  vibe text,
  dietary_needs text[],
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists scout_calls (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid references missions(id),
  restaurant_id uuid references restaurants(id),
  vapi_call_id text,
  status text default 'queued',
  transcript text,
  wait_time text,
  vibe_report text,
  menu_notes text,
  availability text,
  special_notes text,
  recommendation text,
  recommendation_reason text,
  duration_seconds int,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes for common queries
create index if not exists idx_missions_user_id on missions(user_id);
create index if not exists idx_missions_status on missions(status);
create index if not exists idx_scout_calls_mission_id on scout_calls(mission_id);
create index if not exists idx_scout_calls_vapi_call_id on scout_calls(vapi_call_id);
create index if not exists idx_restaurants_google_place_id on restaurants(google_place_id);

-- Enable realtime for live dashboard updates
alter publication supabase_realtime add table missions;
alter publication supabase_realtime add table scout_calls;
