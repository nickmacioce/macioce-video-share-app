import { cookies } from "next/headers";

const CSRF_COOKIE = "csrf-token";
const CSRF_HEADER = "x-csrf-token";
const TOKEN_LENGTH = 32;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is required");
  }
  return secret;
}

// Convert string to ArrayBuffer
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(str);
  return uint8Array.buffer.slice(
    uint8Array.byteOffset,
    uint8Array.byteOffset + uint8Array.byteLength
  );
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  );
}

// Generate a random token
async function generateRandomToken(): Promise<string> {
  const buffer = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(buffer);
  return arrayBufferToHex(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  );
}

// Sign a token with HMAC
async function signToken(token: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    stringToArrayBuffer(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    stringToArrayBuffer(token)
  );

  return `${token}.${arrayBufferToHex(signature)}`;
}

// Verify a signed token
async function verifySignedToken(signedToken: string): Promise<boolean> {
  const [token, signature] = signedToken.split(".");
  if (!token || !signature) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    stringToArrayBuffer(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  try {
    return await crypto.subtle.verify(
      "HMAC",
      key,
      hexToArrayBuffer(signature),
      stringToArrayBuffer(token)
    );
  } catch {
    return false;
  }
}

// Generate and set CSRF token cookie
export async function generateCsrfToken(): Promise<string> {
  const token = await generateRandomToken();
  const signedToken = await signToken(token);

  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE, signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });

  return signedToken;
}

// Get CSRF token from cookie (for sending to client)
export async function getCsrfToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE)?.value || null;
}

// Validate CSRF token from request header against cookie
export async function validateCsrfToken(
  headerToken: string | null,
  cookieToken: string | null
): Promise<boolean> {
  if (!headerToken || !cookieToken) {
    return false;
  }

  // Tokens must match
  if (headerToken !== cookieToken) {
    return false;
  }

  // Verify the signature is valid
  return verifySignedToken(cookieToken);
}

// Helper to get CSRF token from request
export function getCsrfTokenFromRequest(request: Request): string | null {
  return request.headers.get(CSRF_HEADER);
}

// Helper to get CSRF cookie from request
export function getCsrfCookieFromRequest(
  cookieHeader: string | null
): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const csrfCookie = cookies.find((c) => c.startsWith(`${CSRF_COOKIE}=`));

  if (!csrfCookie) return null;

  return csrfCookie.split("=")[1];
}
