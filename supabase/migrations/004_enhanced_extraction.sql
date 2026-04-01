-- Enhanced extraction fields for richer call intel
ALTER TABLE scout_calls
  ADD COLUMN IF NOT EXISTS noise_level text,
  ADD COLUMN IF NOT EXISTS crowd_level text,
  ADD COLUMN IF NOT EXISTS outdoor_seating boolean,
  ADD COLUMN IF NOT EXISTS bar_seating boolean,
  ADD COLUMN IF NOT EXISTS vibe_tags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS price_per_person text;
