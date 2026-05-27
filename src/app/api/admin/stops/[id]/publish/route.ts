import { NextResponse } from "next/server";

import { getSiteUrl, hasTwilioConfig } from "@/lib/env";
import { requireAdminApi } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// POST /api/admin/stops/[id]/publish — one-shot action:
// - Flip is_published to true (instant reveal, no display_after delay)
// - Send the SMS teaser to every verified active subscriber
// - Mark notification_sent so the button hides on subsequent renders
//
// Idempotent failure modes:
//   - 409 if SMS was already sent (notification_sent=true) — assume someone
//     already pressed this and we don't want a double-blast
//   - publishing without Twilio configured is allowed (returns warning) so the
//     city can still go live; SMS gets skipped

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase service role is not configured." }, { status: 503 });

  const { data: stop, error: stopError } = await supabase
    .from("stops")
    .select("id, slug, city, country, teaser, is_published, notification_sent")
    .eq("id", id)
    .single();

  if (stopError || !stop) return NextResponse.json({ error: "City not found." }, { status: 404 });
  if (stop.notification_sent) {
    return NextResponse.json({ error: "SMS has already been sent for this city." }, { status: 409 });
  }

  // 1) Reveal the city publicly
  if (!stop.is_published) {
    const { error: pubError } = await supabase.from("stops").update({ is_published: true }).eq("id", id);
    if (pubError) return NextResponse.json({ error: pubError.message }, { status: 500 });
  }

  // 2) Send SMS to verified subscribers (skip gracefully if Twilio isn't configured)
  if (!hasTwilioConfig()) {
    return NextResponse.json({
      ok: true,
      published: true,
      smsSent: 0,
      warning: "City published. Twilio is not configured yet, so no SMS was sent.",
    });
  }

  const { data: subscribers, error: subscriberError } = await supabase
    .from("subscribers")
    .select("id, phone_number")
    .not("verified_at", "is", null)
    .is("unsubscribed_at", null);

  if (subscriberError) return NextResponse.json({ error: subscriberError.message }, { status: 500 });

  if (!subscribers || subscribers.length === 0) {
    await supabase.from("stops").update({ notification_sent: true }).eq("id", id);
    return NextResponse.json({
      ok: true,
      published: true,
      smsSent: 0,
      message: "City published. No verified subscribers yet, so no SMS sent.",
    });
  }

  const { default: twilio } = await import("twilio");
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // SMS link points to home with focus param so the map zooms to this city on arrival.
  const body = `${stop.city}: ${stop.teaser} ${getSiteUrl()}/?focus=${stop.slug}`;

  let sent = 0;
  for (const subscriber of subscribers) {
    try {
      await client.messages.create({
        to: subscriber.phone_number,
        body,
        ...(process.env.TWILIO_MESSAGING_SERVICE_SID
          ? { messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID }
          : { from: process.env.TWILIO_FROM_NUMBER }),
      });
      sent += 1;
      await supabase.from("notification_deliveries").insert({
        stop_id: stop.id,
        subscriber_id: subscriber.id,
        status: "sent",
      });
    } catch (error) {
      await supabase.from("notification_deliveries").insert({
        stop_id: stop.id,
        subscriber_id: subscriber.id,
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown Twilio error",
      });
    }
  }

  await supabase.from("stops").update({ notification_sent: true }).eq("id", id);

  return NextResponse.json({
    ok: true,
    published: true,
    smsSent: sent,
    smsAttempted: subscribers.length,
  });
}
