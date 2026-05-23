import { NextResponse } from "next/server";

import { getSiteUrl, hasTwilioConfig } from "@/lib/env";
import { requireAdminApi } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase service role is not configured." }, { status: 503 });
  if (!hasTwilioConfig()) return NextResponse.json({ error: "Twilio is not configured." }, { status: 503 });

  const { data: stop, error: stopError } = await supabase
    .from("stops")
    .select("id, slug, title, location_label, teaser, is_published, notification_sent")
    .eq("id", id)
    .single();

  if (stopError || !stop) return NextResponse.json({ error: "Stop not found." }, { status: 404 });
  if (!stop.is_published) return NextResponse.json({ error: "Publish the stop before sending SMS." }, { status: 400 });
  if (stop.notification_sent) return NextResponse.json({ error: "SMS has already been sent for this stop." }, { status: 409 });

  const { data: subscribers, error: subscriberError } = await supabase
    .from("subscribers")
    .select("id, phone_number")
    .not("verified_at", "is", null)
    .is("unsubscribed_at", null);

  if (subscriberError) return NextResponse.json({ error: subscriberError.message }, { status: 500 });
  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ message: "No verified active subscribers yet." });
  }

  const { default: twilio } = await import("twilio");
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const body = `New update from ${stop.location_label}: ${stop.teaser} ${getSiteUrl()}/stops/${stop.slug}`;
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

  await supabase.from("stops").update({ notification_sent: true }).eq("id", stop.id);

  return NextResponse.json({ message: `SMS update attempted for ${subscribers.length} subscribers. Sent: ${sent}.` });
}
