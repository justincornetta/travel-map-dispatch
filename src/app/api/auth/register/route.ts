import { NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { normalizePhoneNumber } from "@/lib/utils";

// Create a visitor account with email + password. We use the service-role admin
// API with email_confirm:true so the account is usable immediately (no
// confirmation email round-trip), then sign the user in on the cookie-aware
// server client so they're logged in right away. The handle_new_user trigger
// mirrors the metadata into public.profiles.

const schema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  phone: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const admin = createSupabaseAdminClient();
  const supabase = await createServerSupabaseClient();
  if (!admin || !supabase) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the registration fields and try again." }, { status: 400 });
  }
  const { first_name, last_name, email, password } = parsed.data;

  // Normalize an optional phone; ignore an unparseable one rather than failing.
  const phone = parsed.data.phone ? normalizePhoneNumber(parsed.data.phone) : "";

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name, last_name, phone },
  });

  if (createError) {
    const already = /registered|exists|already/i.test(createError.message);
    return NextResponse.json(
      { error: already ? "An account with that email already exists. Try signing in." : createError.message },
      { status: already ? 409 : 400 },
    );
  }

  // Log the new user in (sets the session cookie on the response).
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    // Account exists now; surface a soft error so they can sign in manually.
    return NextResponse.json({ ok: true, signedIn: false });
  }

  return NextResponse.json({ ok: true, signedIn: true });
}
