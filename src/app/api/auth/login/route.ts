import { NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { normalizePhoneNumber } from "@/lib/utils";

// Sign in with EITHER an email or a phone number, plus a password. Phone is not
// a Supabase auth credential — it's a stored profile field — so when the caller
// gives a phone we resolve it to that account's email first, then do the normal
// email/password sign-in on the cookie-aware server client (which sets the
// session cookie on the response).

const schema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(1),
});

const GENERIC_ERROR = "That email/phone and password don't match.";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your email or phone and password." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 503 });
  }

  const { identifier, password } = parsed.data;
  let email = identifier.trim();

  // Treat anything without an "@" as a phone number to resolve → email.
  if (!email.includes("@")) {
    const phone = normalizePhoneNumber(identifier);
    if (!phone) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }
    const admin = createSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Auth is not configured." }, { status: 503 });
    }
    const { data } = await admin
      .from("profiles")
      .select("email")
      .eq("phone", phone)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!data?.email) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }
    email = data.email;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
