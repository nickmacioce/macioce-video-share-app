import { NextRequest, NextResponse } from "next/server";
import { validatePassword, setAuthCookie } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  validateCsrfToken,
  getCsrfTokenFromRequest,
  getCsrfCookieFromRequest,
} from "@/lib/csrf";

function getClientIp(request: NextRequest): string {
  // Vercel provides the real IP in x-forwarded-for
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  // Fallback to x-real-ip
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Default fallback
  return "unknown";
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkRateLimit(clientIp);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
            ),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          },
        }
      );
    }

    // CSRF validation
    const csrfHeader = getCsrfTokenFromRequest(request);
    const csrfCookie = getCsrfCookieFromRequest(
      request.headers.get("cookie")
    );

    const isValidCsrf = await validateCsrfToken(csrfHeader, csrfCookie);
    if (!isValidCsrf) {
      return NextResponse.json(
        { error: "Invalid request. Please refresh the page and try again." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    await setAuthCookie();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
