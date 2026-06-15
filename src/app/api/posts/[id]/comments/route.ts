import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminEmails } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// POST /api/posts/[id]/comments — add a comment as the signed-in visitor.
// Reads/writes go through the cookie-aware server client so Supabase RLS
// enforces that user_id matches the session. The display name is captured from
// the user's signup metadata and stored on the row (denormalized) so the public
// feed never needs to read the profiles table.
//
// Reads + deletes happen client-side via RLS; this route exists so a new comment
// can also trigger an optional owner email (RESEND_API_KEY) server-side.

const schema = z.object({ body: z.string().trim().min(1).max(1000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to comment." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Comment must be 1–1000 characters." }, { status: 400 });
  }

  const meta = (user.user_metadata ?? {}) as { first_name?: string; last_name?: string };
  const authorName =
    `${meta.first_name ?? ""} ${meta.last_name ?? ""}`.trim() ||
    user.email?.split("@")[0] ||
    "Guest";

  const { data, error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, user_id: user.id, author_name: authorName, body: parsed.data.body })
    .select("id, user_id, author_name, body, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Best-effort owner notification; never blocks the response.
  void notifyOwner(authorName, parsed.data.body);

  return NextResponse.json({ comment: data });
}

async function notifyOwner(authorName: string, body: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = getAdminEmails()[0];
  if (!apiKey || !to) return; // not configured — silently skip
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Personal Travel Blog <onboarding@resend.dev>",
        to,
        subject: `New comment from ${authorName}`,
        text: `${authorName} commented:\n\n${body}`,
      }),
    });
  } catch {
    /* notification is non-critical */
  }
}
