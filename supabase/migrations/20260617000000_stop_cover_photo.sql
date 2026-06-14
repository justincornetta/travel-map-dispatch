-- Per-city "cover" photo: which image shows on the home-page postcard (and the
-- social-share preview). Nullable; falls back to the first photo when unset.
-- on delete set null so removing the chosen photo just reverts to the fallback.

alter table public.stops
  add column if not exists cover_photo_id uuid references public.photos(id) on delete set null;
