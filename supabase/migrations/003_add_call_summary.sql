alter table scout_calls add column if not exists call_summary text;
alter table scout_calls add column if not exists highlights jsonb;
