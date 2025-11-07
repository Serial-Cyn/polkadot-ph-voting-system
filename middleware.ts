import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession, findUserById } from "./lib/data";

function parseCookies(cookieHeader?: string | null) {
  if (!cookieHeader) return {} as Record<string, string>;
  return Object.fromEntries(cookieHeader.split(";").map((c) => {
    const [k, ...v] = c.trim().split("=");
    return [k, decodeURIComponent(v.join("="))];
  }));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public assets and API auth and candidate listing
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/candidates") || pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico") || pathname === "/") {
    return NextResponse.next();
  }

  // Protect dashboard, vote, and admin routes
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/vote") || pathname.startsWith("/admin") || pathname.startsWith("/api/vote") || pathname.startsWith("/api/candidates")) {
    const cookieHeader = req.headers.get("cookie");
    const cookies = parseCookies(cookieHeader);
    const token = cookies["session"];
    // Accept a stateless cookie value as an authenticated user id for the
    // prototype. In many dev setups the Edge middleware runs separately
    // from Node API routes so in-memory user stores won't be shared. The
    // cookie contains the user id (wallet address) and is sufficient here
    // to allow access; API routes should still validate roles/permissions.
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Note: we avoid enforcing admin-only redirects here because the
    // middleware cannot reliably read the mutable in-memory user store.
    // Admin checks are performed server-side in API routes that have
    // access to the authoritative user records.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/vote/:path*", "/admin/:path*", "/api/vote/:path*", "/api/candidates/:path*"],
};
