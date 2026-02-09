import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthToken, verifyAuthToken } from "@/lib/auth";

const publicPaths = ["/login", "/api/auth/login", "/api/auth/csrf"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check authentication
  const token = getAuthToken(request.headers.get("cookie"));
  const isAuth = await verifyAuthToken(token);

  if (!isAuth) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
