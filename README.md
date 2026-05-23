# Travel Map Dispatch Site

Interactive travel map, stop dispatches, protected admin publishing, SMS subscriber signup, and Twilio text alerts.

## Local Development

```bash
corepack pnpm install
corepack pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Without environment variables, the public map renders with seed data. Supabase and Twilio are required for admin persistence, subscriptions, uploads, and SMS sending.

Copy `.env.example` to `.env.local` and fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAILS`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM_NUMBER`
- `NEXT_PUBLIC_SITE_URL` for deployed SMS links

## Supabase Setup

Run the migration in `supabase/migrations/20260523000000_travel_dispatch.sql`.

The migration creates:

- `stops` for map pins and posts.
- `photos` for public stop images.
- `subscribers` for opted-in SMS recipients.
- `notification_deliveries` for SMS audit records.
- `travel-photos` public storage bucket.

RLS allows anonymous read access only to published stops/photos whose optional `display_after` time has passed. Subscriber data and notification records are accessed through server routes using the service role key.

## Twilio Setup

Set the inbound webhook for your Twilio number or Messaging Service to:

```text
https://your-domain.com/api/twilio/webhook
```

Subscribers receive a confirmation text first. Published dispatch notifications send one short SMS teaser plus a link to the full stop page.

## Admin

Visit `/admin/login` and sign in with an email listed in `ADMIN_EMAILS`.

Admin routes let you create/edit stops, upload photos, publish to the public map, and send one SMS notification per stop.
