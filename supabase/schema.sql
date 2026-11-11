-- Hypesift database schema for Supabase. Run once in the SQL Editor of a new project.
-- Before running: Authentication > Sign In / Providers > enable "Allow anonymous sign-ins".

-- One row per player: their picks, best scores, and (only if they opt in) a nickname.
create table if not exists public.players (
  id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint players_size check (pg_column_size(data) < 20000)
);

-- One row per player: claims they suggested (visible only to them and to you in the dashboard).
create table if not exists public.submissions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint submissions_size check (pg_column_size(data) < 8000)
);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists players_touch on public.players;
create trigger players_touch before update on public.players
  for each row execute function public.touch_updated_at();

drop trigger if exists submissions_touch on public.submissions;
create trigger submissions_touch before update on public.submissions
  for each row execute function public.touch_updated_at();

alter table public.players enable row level security;
alter table public.submissions enable row level security;

-- Players: everyone can read the board; each player can only create and change their own row.
drop policy if exists "players are readable" on public.players;
create policy "players are readable" on public.players
  for select to anon, authenticated using (true);

drop policy if exists "players insert own" on public.players;
create policy "players insert own" on public.players
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "players update own" on public.players;
create policy "players update own" on public.players
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Submissions: a player sees and writes only their own row. You read all of them in the dashboard.
drop policy if exists "submissions select own" on public.submissions;
create policy "submissions select own" on public.submissions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "submissions insert own" on public.submissions;
create policy "submissions insert own" on public.submissions
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "submissions update own" on public.submissions;
create policy "submissions update own" on public.submissions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
