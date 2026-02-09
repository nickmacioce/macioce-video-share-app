import { NextResponse } from "next/server";
import { generateCsrfToken, getCsrfToken } from "@/lib/csrf";

export async function GET() {
  try {
    // Get existing token or generate new one
    let token = await getCsrfToken();

    if (!token) {
      token = await generateCsrfToken();
    }

    return NextResponse.json({ token });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { status: 500 }
    );
  }
}
