import { NextResponse } from "next/server";
import { listVideos, formatFileSize } from "@/lib/s3";

export async function GET() {
  try {
    const videos = await listVideos();

    const formattedVideos = videos.map((video) => ({
      key: video.key,
      name: video.name,
      size: formatFileSize(video.size),
      sizeBytes: video.size,
      lastModified: video.lastModified.toISOString(),
    }));

    return NextResponse.json(formattedVideos);
  } catch (error) {
    console.error("Error listing videos:", error);
    return NextResponse.json(
      { error: "Failed to list videos" },
      { status: 500 }
    );
  }
}
