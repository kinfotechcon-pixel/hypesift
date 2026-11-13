-- "Check a story": a log of completed checks. It powers the 3-per-day limit and re-uses recent results.
-- Run once in the Supabase SQL Editor. Row-level security is on with NO policies, so players and the
-- public API cannot read or write it. Only the check-story function (service role) can.

create table if not exists public.story_checks (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  cache_key text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  constraint story_checks_size check (pg_column_size(result) < 8000)
);

create index if not exists story_checks_user_time on public.story_checks (user_id, created_at desc);
create index if not exists story_checks_cache on public.story_checks (cache_key, created_at desc);
create index if not exists story_checks_time on public.story_checks (created_at desc);

alter table public.story_checks enable row level security;
revoke all on public.story_checks from anon, authenticated;

-- A readable view for you in the Table Editor.
create or replace view public.story_checks_readable
with (security_invoker = true) as
select
  created_at as checked_at,
  result->>'verdict'  as verdict,
  result->>'claim'    as claim,
  result->>'headline' as headline,
  result->>'confidence' as confidence,
  user_id as player_id
from public.story_checks
order by created_at desc;

revoke all on public.story_checks_readable from anon, authenticated;
