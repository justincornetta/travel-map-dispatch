-- Denormalize the liker's display name onto post_likes so the feed can show a
-- "who liked this" list on hover without exposing the profiles table (profiles
-- RLS only lets a user read their own row). Populated at like-time, same pattern
-- as post_comments.author_name.

alter table public.post_likes add column if not exists liker_name text;
