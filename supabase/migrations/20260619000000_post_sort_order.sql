-- Manual ordering for a city's posts. Until now posts were ordered purely by
-- happened_at; sort_order lets the admin arrange them by hand (drag / up-down)
-- and the public feed follows that order. Backfill existing posts so each
-- city's current chronological order is preserved as the starting sort_order.

alter table public.posts add column if not exists sort_order integer not null default 0;

with ranked as (
  select id, row_number() over (partition by stop_id order by happened_at asc) - 1 as rn
  from public.posts
)
update public.posts p
set sort_order = ranked.rn
from ranked
where ranked.id = p.id;

create index if not exists posts_stop_order_idx on public.posts (stop_id, sort_order);
