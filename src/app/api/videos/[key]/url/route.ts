import { NextRequest, NextResponse } from "next/server";
import { getVideoStreamUrl, getVideoDownloadUrl } from "@/lib/s3";

// Validate S3 key to prevent path traversal and injection attacks
function isValidS3Key(key: string): boolean {
  // Reject empty keys
  if (!key || key.trim() === "") {
    return false;
  }

  // Reject path traversal attempts
  if (key.includes("..") || key.includes("./")) {
    return false;
  }

  // Reject keys starting with /
  if (key.startsWith("/")) {
    return false;
  }

  // Reject keys with null bytes
  if (key.includes("\0")) {
    return false;
  }

  // Reject keys with control characters
  if (/[\x00-\x1f\x7f]/.test(key)) {
    return false;
  }

  // Validate file extension (must be a video file)
  const validExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv"];
  const lowerKey = key.toLowerCase();
  if (!validExtensions.some((ext) => lowerKey.endsWith(ext))) {
    return false;
  }

  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const decodedKey = decodeURIComponent(key);

    // Validate the key
    if (!isValidS3Key(decodedKey)) {
      return NextResponse.json(
        { error: "Invalid video key" },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const download = searchParams.get("download") === "true";

    const url = download
      ? await getVideoDownloadUrl(decodedKey)
      : await getVideoStreamUrl(decodedKey);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    return NextResponse.json(
      { error: "Failed to generate URL" },
      { status: 500 }
    );
  }
}
