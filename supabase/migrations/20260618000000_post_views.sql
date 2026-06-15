-- Per-account reading progress: one row per (user, post) the user has seen.
-- Used to mark cities "Viewed" on the home timeline and to resume the visitor
-- at the next unread city. Private to each user — unlike likes/comments, view
-- rows are only ever readable by their owner.

create table if not exists public.post_views (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.post_views enable row level security;

drop policy if exists "Users can read own views" on public.post_views;
create policy "Users can read own views"
on public.post_views for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users can record own views" on public.post_views;
create policy "Users can record own views"
on public.post_views for insert to authenticated with check (user_id = auth.uid());

grant select, insert on public.post_views to authenticated;
