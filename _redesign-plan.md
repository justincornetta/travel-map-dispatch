# Redesign Plan — Cities + Multi-Post + Direct Upload

> Working doc. Once approved, this drives the implementation tasks (#8–#14 in TaskList).

## Context — why this redesign

The first user smoke test hit HTTP 413 because Vercel's serverless function has a 4.5 MB request body limit and iPhone photos are larger. That blocked save entirely. While diagnosing, the user also asked for a meaningful model change: cities should host multiple blog posts (each with its own photos), and the dropdown-driven UX should replace today's free-text coords + single-post form.

The redesign is one chunk of work because the schema, admin UI, and public read paths all change together. Doing them piecemeal would leave the app in a broken intermediate state.

## Locked decisions (from user)

| Decision | Choice |
|---|---|
| City list source | `career-break-planning/app/travel.js` — copy into `src/lib/cities.ts` |
| Geocoding | Static lookup (coords baked into dropdown) |
| Photo ownership | Photos belong to **posts**, not cities |
| Photo upload | Client-direct to Supabase Storage via signed URL |
| Page model | `/stops/<city-slug>` stays canonical, home page supports `?focus=<slug>` deeplink that zooms map + opens city panel |
| Publish flow | Per-city draft → "Publish + SMS" reveals city publicly AND sends one SMS. Subsequent posts within a published city are instant-visible, no new SMS. |
| Timing | Drop `display_after` delay entirely — publish is instant |

## Data model (after)

```
stops (table name kept; "city" in UI copy only)
├── id, slug, city, country, latitude, longitude
├── status (visited|current|upcoming)
├── arrival_date, departure_date
├── teaser (≤280 chars, the SMS body)
├── is_published, notification_sent
├── created_at, updated_at
└── (display_after removed)

posts (new) — child of stops
├── id, stop_id (fk→stops, on delete cascade)
├── happened_at (timestamptz, when the moment occurred — drives ordering & hour-bucket dividers)
├── title (optional, free text)
├── body (markdown/plain text)
├── created_at, updated_at

photos
├── id, post_id (fk→posts, on delete cascade)  -- changed from stop_id
├── storage_path, alt_text, display_order
├── created_at
```

Posts are ordered by `happened_at` ascending (chronological). Hour-bucket dividers render between consecutive posts whose `happened_at` falls in different clock hours.

Existing `stops` rows: only the failed test attempt (no DB row created due to 413). Safe to migrate forward without data preservation.

### RLS

- Public can read **published** stops (same rule as today)
- Public can read posts only where the parent stop is published
- Public can read photos only where the parent post's parent stop is published

## UI inspiration — 222-style city detail page

Reference: <https://222.app>. User shared a screen recording.

- Background: dark/near-black, full-screen
- Sticky header (top): city name + date range + close X (returns to home/map)
- Sticky footer (bottom): share button (drops 222's audience filter and play scrubber — n/a for this app)
- Feed body: vertical scroll of posts ordered by `happened_at` ASC
- Each post:
  - Photo carousel (one or more photos, swipeable left/right, dot indicators)
  - Body text below the carousel
  - Tiny rotated `happened_at` timestamp along the left edge
  - Heart icon disabled / not implemented v1 (could be a follow-up)
- Time dividers: between posts when `happened_at` crosses into a new clock hour, render `———— 2 AM ————` (or `9 AM`, etc) full-width

## URL surface (after)

| Path | Purpose |
|---|---|
| `/` | Home — map + timeline. `?focus=<slug>` zooms to pin and opens detail panel. |
| `/stops/<slug>` | City page — header (city, country, dates, status) + chronological feed of published posts, each with its photo gallery. |
| `/subscribe` | Unchanged. |
| `/admin/login` | Unchanged. |
| `/admin` | List of cities (draft + published). |
| `/admin/stops/new` | Create city — dropdown selection auto-fills city/country/coords. Save as draft. |
| `/admin/stops/<id>` | Edit city + manage posts (add/edit/delete posts, upload photos per post). Two buttons: "Save changes" (no SMS) and "Publish + send SMS" (one-shot, hidden after sent). |

## API routes (after)

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/stops` | POST | Create/update city (no files). Returns id + slug. |
| `/api/admin/stops/<id>` | DELETE | Delete city (cascades to posts + photos). |
| `/api/admin/stops/<id>/publish` | POST | Set is_published=true, send SMS, set notification_sent=true. Idempotent — fails if already sent. |
| `/api/admin/posts` | POST | Create/update post. |
| `/api/admin/posts/<id>` | DELETE | Delete post. |
| `/api/admin/uploads/signed-url` | POST | Returns Supabase Storage signed upload URL for a given path. Replaces server-side file proxy. |
| `/api/admin/photos` | POST | After client direct-upload, server registers `(post_id, storage_path, alt_text)` rows. |
| `/api/subscribe`, `/api/subscribe/confirm`, `/api/twilio/webhook` | unchanged |

## Implementation order

Plan executes in this strict sequence (each step depends on the previous):

1. **Schema migration** (Task #8) — apply via Supabase MCP. Drops display_after, adds city/country to stops, creates posts table, repoints photos.post_id, updates RLS.
2. **City data file** (Task #9) — `src/lib/cities.ts` with the 11 itinerary cities + spillover scenarios, each `{ slug, city, country, latitude, longitude }`.
3. **Direct-upload plumbing** (Task #10) — new `signed-url` route, new `photos` POST route, browser helper.
4. **Admin UI rewrite** (Task #11) — city dropdown, posts repeater, two-button save.
5. **Public city page** (Task #12) — render posts feed.
6. **Home `?focus=` deeplink** (Task #13) — map zoom + panel open.
7. **Publish + SMS action** (Task #14) — wire the Publish button to set flags and send SMS. Drops the old scheduled-reveal path.

## Out of scope for this redesign

- Twilio config (user still on plane — Phase B unchanged)
- A2P 10DLC registration
- Custom domain / SMTP for Supabase
- Image resizing (we'll just trust the user to upload reasonable sizes — Supabase Storage has its own 50MB default cap)
- Post editing rich-text features (Markdown rendering only)
- Comments, reactions, share buttons

## Verification (when done)

1. Admin: select "Lisbon" from dropdown → city/country/coords auto-fill → save draft → verify no SMS sent → verify city does NOT appear on public homepage.
2. Admin: open the draft city → add post → upload 2-3 photos via client-direct (verify no 413) → save.
3. Admin: click "Publish + send SMS" → verify city appears on public homepage, SMS sent to verified subscriber (once Twilio configured), notification_sent flag set, button now hidden.
4. Add a second post to the published city → save → verify it instantly appears on `/stops/lisbon` with no additional SMS.
5. Visit `https://travel-map-dispatch.vercel.app/?focus=lisbon` → map zooms to Lisbon, panel opens with city detail.

## Notes for the implementer

- Keep `stops` as the table name to avoid breaking all the existing query code. The semantic shift to "city" is UI-copy only.
- The Supabase MCP can run the migration directly via `apply_migration`.
- All file paths and patterns to reuse:
  - `src/lib/supabase/server.ts` — `createSupabaseAdminClient()`, `createServerSupabaseClient()`
  - `src/lib/data.ts` — extend with `getPublishedPosts(stopId)`, `getStopBySlug(slug)`
  - `src/lib/env.ts` — env checkers stay as-is
  - `src/app/api/admin/stops/[id]/notify/route.ts` — replace with `.../publish/route.ts` logic that combines is_published flip + SMS send
- The current `/api/admin/stops/route.ts` will need full rewrite (no more file handling).
