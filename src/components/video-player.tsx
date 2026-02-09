"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoPlayerProps {
  videoUrl: string | null;
  videoName: string;
  loading: boolean;
  error: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoPlayer({
  videoUrl,
  videoName,
  loading,
  error,
  open,
  onOpenChange,
}: VideoPlayerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full md:max-w-[85vw] lg:max-w-[75vw] xl:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{videoName}</DialogTitle>
        </DialogHeader>
        <div className="aspect-video w-full bg-black rounded-lg overflow-hidden max-h-[80vh]">
          {loading && <Skeleton className="w-full h-full" />}
          {error && !loading && (
            <div className="w-full h-full flex items-center justify-center text-destructive">
              {error}
            </div>
          )}
          {videoUrl && !loading && !error && (
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            >
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
