import { cookies } from "next/headers";

const AUTH_COOKIE = "auth-token";
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

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

// Convert string to Uint8Array (for comparison operations)
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Convert ArrayBuffer to hex string
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Timing-safe string comparison that doesn't leak length
function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = stringToUint8Array(a);
  const bBytes = stringToUint8Array(b);

  // Use the longer length to prevent length-based timing attacks
  const maxLength = Math.max(aBytes.length, bBytes.length);
  const paddedA = new Uint8Array(maxLength);
  const paddedB = new Uint8Array(maxLength);

  paddedA.set(aBytes);
  paddedB.set(bBytes);

  // XOR all bytes and accumulate differences
  let result = aBytes.length ^ bBytes.length; // Will be non-zero if lengths differ
  for (let i = 0; i < maxLength; i++) {
    result |= paddedA[i] ^ paddedB[i];
  }

  return result === 0;
}

async function createSignature(data: string): Promise<string> {
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
    stringToArrayBuffer(data)
  );

  return arrayBufferToHex(signature);
}

async function createToken(timestamp: number): Promise<string> {
  const signature = await createSignature(timestamp.toString());
  return `${timestamp}.${signature}`;
}

async function verifyToken(token: string): Promise<boolean> {
  const [timestampStr, signature] = token.split(".");
  if (!timestampStr || !signature) {
    return false;
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return false;
  }

  // Check if token is expired
  if (Date.now() - timestamp > TOKEN_EXPIRY) {
    return false;
  }

  // Verify signature
  const expectedSignature = await createSignature(timestampStr);

  return timingSafeEqual(signature, expectedSignature);
}

export function validatePassword(password: string): boolean {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) {
    throw new Error("APP_PASSWORD environment variable is required");
  }

  return timingSafeEqual(password, appPassword);
}

export async function setAuthCookie(): Promise<void> {
  const token = await createToken(Date.now());
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_EXPIRY / 1000,
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  if (!token) {
    return false;
  }

  return verifyToken(token);
}

export function getAuthToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const authCookie = cookies.find((c) => c.startsWith(`${AUTH_COOKIE}=`));

  if (!authCookie) return null;

  return authCookie.split("=")[1];
}

export async function verifyAuthToken(token: string | null): Promise<boolean> {
  if (!token) return false;
  return verifyToken(token);
}
