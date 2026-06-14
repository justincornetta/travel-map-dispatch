-- Per-post likes & comments for signed-in visitors.
-- Likes are unique per (post, user). Comments store a denormalized author_name
-- (captured at insert from the signed-in user's metadata) so the public feed can
-- show who commented without exposing the profiles table.

create extension if not exists pgcrypto;

-- ---- Likes -----------------------------------------------------------------
create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

drop policy if exists "Anyone can read likes" on public.post_likes;
create policy "Anyone can read likes"
on public.post_likes for select to anon, authenticated using (true);

drop policy if exists "Users can like" on public.post_likes;
create policy "Users can like"
on public.post_likes for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users can unlike" on public.post_likes;
create policy "Users can unlike"
on public.post_likes for delete to authenticated using (user_id = auth.uid());

grant select on public.post_likes to anon, authenticated;
grant insert, delete on public.post_likes to authenticated;

-- ---- Comments --------------------------------------------------------------
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;

drop policy if exists "Anyone can read comments" on public.post_comments;
create policy "Anyone can read comments"
on public.post_comments for select to anon, authenticated using (true);

drop policy if exists "Users can comment" on public.post_comments;
create policy "Users can comment"
on public.post_comments for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users can delete own comment" on public.post_comments;
create policy "Users can delete own comment"
on public.post_comments for delete to authenticated using (user_id = auth.uid());

grant select on public.post_comments to anon, authenticated;
grant insert, delete on public.post_comments to authenticated;
