import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Paths that never require a visitor account: the welcome/auth screens, the
// auth callback, the admin area (which enforces its own ADMIN_EMAILS gate),
// the legal pages, and all API routes (they do their own auth).
const PUBLIC_PREFIXES = ["/welcome", "/account", "/auth", "/admin", "/privacy", "/terms", "/api"];

// Let link-preview + search crawlers through so shared links still render a
// rich preview, while humans must still sign in.
const BOT_RE =
  /(bot|crawl|spider|facebookexternalhit|slackbot|twitterbot|whatsapp|telegram|discordbot|linkedinbot|embedly|quora link preview|pinterest|redditbot|google|bing|duckduck|baidu|yandex)/i;

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // If Supabase isn't configured, don't gate (keeps local/dev usable).
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (user) {
    // Signed-in users shouldn't sit on the welcome/gate screen.
    if (pathname === "/welcome") {
      const home = request.nextUrl.clone();
      home.pathname = "/";
      home.search = "";
      return NextResponse.redirect(home);
    }
    return response;
  }

  // Logged out: allow public paths + crawlers; otherwise send to the welcome gate.
  if (isPublicPath(pathname)) return response;
  if (BOT_RE.test(request.headers.get("user-agent") ?? "")) return response;

  const welcome = request.nextUrl.clone();
  welcome.pathname = "/welcome";
  welcome.search = "";
  welcome.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(welcome);
}

export const config = {
  // Run on everything except Next internals and static asset files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
