import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "";
const PRESIGNED_URL_EXPIRY = 3600; // 1 hour

export interface VideoFile {
  key: string;
  name: string;
  size: number;
  lastModified: Date;
}

export async function listVideos(): Promise<VideoFile[]> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
  });

  const response = await s3Client.send(command);
  const contents = response.Contents || [];

  return contents
    .filter((item) => {
      const key = item.Key?.toLowerCase() || "";
      return (
        key.endsWith(".mp4") ||
        key.endsWith(".webm") ||
        key.endsWith(".mov") ||
        key.endsWith(".avi") ||
        key.endsWith(".mkv")
      );
    })
    .map((item) => ({
      key: item.Key || "",
      name: item.Key?.split("/").pop() || item.Key || "",
      size: item.Size || 0,
      lastModified: item.LastModified || new Date(),
    }))
    .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}

export async function getVideoStreamUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY,
  });
}

export async function getVideoDownloadUrl(key: string): Promise<string> {
  const filename = key.split("/").pop() || key;

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY,
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}
