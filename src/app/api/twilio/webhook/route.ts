import { NextResponse } from "next/server";

import { hasSupabaseAdminConfig } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { normalizePhoneNumber } from "@/lib/utils";

const stopWords = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);

export async function POST(request: Request) {
  if (!hasSupabaseAdminConfig()) return new NextResponse("Not configured", { status: 503 });

  const formData = await request.formData();
  const body = String(formData.get("Body") ?? "").trim().toUpperCase();
  const from = normalizePhoneNumber(String(formData.get("From") ?? ""));

  if (from && stopWords.has(body)) {
    const supabase = createSupabaseAdminClient()!;
    await supabase
      .from("subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("phone_number", from);
  }

  return new NextResponse("OK", { status: 200 });
}
