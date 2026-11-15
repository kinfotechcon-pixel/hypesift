-- Optional: a readable summary of the "What would bring you back?" poll, for you in the Supabase Table Editor.
-- Each player's answer is stored privately inside their row in the submissions table (data -> poll).
-- Run once in the SQL Editor. The view is closed to players and the public API.

create or replace view public.poll_results
with (security_invoker = true) as
select
  (data->'poll'->>'a')::int as answer_number,
  case (data->'poll'->>'a')::int
    when 0 then 'A new AI word every day'
    when 1 then 'New AI claims every week'
    when 2 then 'Challenging my friends'
    when 3 then 'Streaks and badges'
    when 4 then 'Something else'
    else 'Unknown'
  end as answer,
  count(*) as votes
from public.submissions
where data ? 'poll' and jsonb_typeof(data->'poll') = 'object'
group by 1, 2
order by votes desc;

revoke all on public.poll_results from anon, authenticated;
