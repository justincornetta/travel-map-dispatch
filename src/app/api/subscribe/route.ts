import { NextResponse } from "next/server";
import { z } from "zod";

import { getSiteUrl, hasSupabaseAdminConfig, hasTwilioConfig } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { normalizePhoneNumber } from "@/lib/utils";

const subscribeSchema = z.object({
  phone: z.string().min(7),
  consent: z.string().optional(),
});

async function twilioClient() {
  if (!hasTwilioConfig()) return null;
  const { default: twilio } = await import("twilio");
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

export async function POST(request: Request) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json(
      { error: "Supabase is not configured yet. Add the environment variables from README.md." },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const parsed = subscribeSchema.safeParse({
    phone: formData.get("phone"),
    consent: formData.get("consent"),
  });

  if (!parsed.success || parsed.data.consent !== "on") {
    return NextResponse.json({ error: "Enter a valid number and consent to text updates." }, { status: 400 });
  }

  const phoneNumber = normalizePhoneNumber(parsed.data.phone);
  if (!phoneNumber) {
    return NextResponse.json({ error: "Use a valid US phone number or E.164 formatted number." }, { status: 400 });
  }

  const token = crypto.randomUUID();
  const supabase = createSupabaseAdminClient()!;
  const { error } = await supabase.from("subscribers").upsert(
    {
      phone_number: phoneNumber,
      consented_at: new Date().toISOString(),
      verification_token: token,
      verified_at: null,
      unsubscribed_at: null,
    },
    { onConflict: "phone_number" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const confirmUrl = `${getSiteUrl()}/api/subscribe/confirm?token=${token}`;
  const client = await twilioClient();

  if (!client) {
    return NextResponse.json({
      message:
        "Your number was saved, but Twilio is not configured yet. Add Twilio env vars to send confirmation texts.",
    });
  }

  try {
    const message = await client.messages.create({
      to: phoneNumber,
      body: `Confirm Travel Dispatch texts: ${confirmUrl}. Reply STOP to unsubscribe.`,
      ...(process.env.TWILIO_MESSAGING_SERVICE_SID
        ? { messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID }
        : { from: process.env.TWILIO_FROM_NUMBER }),
    });

    // Twilio accepts the create call but can mark it undelivered immediately
    // (e.g. error 30034 = A2P 10DLC not yet registered). Surface that to the
    // user so they don't sit waiting for a text that never arrives.
    if (message.errorCode === 30034 || message.errorCode === 30035) {
      return NextResponse.json({
        message:
          "Your number was saved, but our SMS provider is still verifying our account with US carriers. Confirmation texts are blocked for the next few days. Please check back soon — we'll send your confirmation as soon as approval lands.",
      });
    }
    if (message.errorCode) {
      return NextResponse.json({
        message: `Your number was saved, but the confirmation text didn't go through (Twilio error ${message.errorCode}). Please try again later.`,
      });
    }
  } catch (error) {
    return NextResponse.json({
      message:
        `Your number was saved, but the confirmation text failed to send (${
          error instanceof Error ? error.message : "unknown error"
        }). You can re-submit this form to try again.`,
    });
  }

  return NextResponse.json({
    message: "Check your phone for a confirmation link before dispatch texts begin.",
  });
}
