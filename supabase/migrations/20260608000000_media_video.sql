-- Add video support to the photos (media) table.
-- Additive + backward-compatible: existing rows default to 'image'.
--
-- media_type  : distinguishes image vs video so the feed renders <img> or <video>.
-- poster_path : optional still-frame for a video (a captured first frame),
--               stored in the same travel-photos bucket as a normal image.

alter table public.photos
  add column if not exists media_type text not null default 'image'
    check (media_type in ('image', 'video'));

alter table public.photos
  add column if not exists poster_path text;
