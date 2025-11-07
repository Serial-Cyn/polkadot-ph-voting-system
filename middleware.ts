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
    const userId = getSession(token);
    if (!userId) {
      // redirect to login
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // admin-only guard for /admin
    if (pathname.startsWith("/admin")) {
      const user = findUserById(userId);
      if (!user || user.role !== "admin") {
        const url = req.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/vote/:path*", "/admin/:path*", "/api/vote/:path*", "/api/candidates/:path*"],
};
