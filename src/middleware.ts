import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName, verifySessionToken } from "@/lib/session";

// Protect committee dashboards. The public /submit routes are never matched.
// Runs on the Edge runtime; verification uses Web Crypto (see lib/session).

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /dashboard/<slug>/...  -> segments = ["dashboard", "<slug>", ...]
  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[1];
  if (!slug) return NextResponse.next();

  // The login page itself must be reachable without a session.
  if (segments[2] === "login") return NextResponse.next();

  const token = req.cookies.get(sessionCookieName(slug))?.value;
  const session = await verifySessionToken(token);

  if (!session || session.slug !== slug) {
    const url = req.nextUrl.clone();
    url.pathname = `/dashboard/${slug}/login`;
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:slug", "/dashboard/:slug/:path*"],
};
