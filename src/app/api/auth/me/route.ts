import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/auth";

// Lightweight client probe: is the current session an admin? Used by the feed
// so admins get a delete control on every comment.
export async function GET() {
  const access = await getAdminAccess();
  return NextResponse.json({ isAdmin: access.ok });
}
