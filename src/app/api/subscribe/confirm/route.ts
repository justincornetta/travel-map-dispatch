import { NextResponse } from "next/server";

import { getSiteUrl, hasSupabaseAdminConfig } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.redirect(`${getSiteUrl()}/subscribe?error=config`);
  }

  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.redirect(`${getSiteUrl()}/subscribe?error=token`);

  const supabase = createSupabaseAdminClient()!;
  await supabase
    .from("subscribers")
    .update({ verified_at: new Date().toISOString(), verification_token: null, unsubscribed_at: null })
    .eq("verification_token", token);

  return NextResponse.redirect(`${getSiteUrl()}/subscribe?confirmed=1`);
}
