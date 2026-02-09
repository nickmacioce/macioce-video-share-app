"use client";

import { useState, useEffect } from "react";
import { Play, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VideoPlayer } from "@/components/video-player";

interface Video {
  key: string;
  name: string;
  size: string;
  sizeBytes: number;
  lastModified: string;
}

export function VideoTable() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionVideo, setActionVideo] = useState<Video | null>(null);

  // Video player state
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerVideoName, setPlayerVideoName] = useState("");
  const [playerVideoUrl, setPlayerVideoUrl] = useState<string | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/videos")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setVideos(data);
        } else {
          setError("Failed to load videos");
        }
      })
      .catch(() => {
        setError("Failed to load videos");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleNameClick = (video: Video) => {
    setActionVideo(video);
    setActionDialogOpen(true);
  };

  const handlePlay = async (video: Video) => {
    setActionDialogOpen(false);
    setPlayerVideoName(video.name);
    setPlayerVideoUrl(null);
    setPlayerError(null);
    setPlayerLoading(true);
    setPlayerOpen(true);

    try {
      const res = await fetch(
        `/api/videos/${encodeURIComponent(video.key)}/url`
      );
      const data = await res.json();
      if (data.url) {
        setPlayerVideoUrl(data.url);
      } else {
        setPlayerError("Failed to load video");
      }
    } catch {
      setPlayerError("Failed to load video");
    } finally {
      setPlayerLoading(false);
    }
  };

  const handlePlayerOpenChange = (open: boolean) => {
    setPlayerOpen(open);
    if (!open) {
      setPlayerVideoUrl(null);
      setPlayerError(null);
      setPlayerLoading(false);
    }
  };

  const handleDownload = async (video: Video) => {
    setActionDialogOpen(false);
    try {
      const res = await fetch(
        `/api/videos/${encodeURIComponent(video.key)}/url?download=true`
      );
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      console.error("Failed to get download URL");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        {error}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No videos found
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {videos.map((video) => (
              <TableRow key={video.key}>
                <TableCell className="max-w-xs">
                  <button
                    onClick={() => handleNameClick(video)}
                    className="text-left truncate block w-full font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {video.name}
                  </button>
                </TableCell>
                <TableCell>{video.size}</TableCell>
                <TableCell>{formatDate(video.lastModified)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePlay(video)}
                      title="Play"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(video)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {videos.map((video) => (
          <Card key={video.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                <button
                  onClick={() => handleNameClick(video)}
                  className="text-left truncate block w-full font-semibold text-primary hover:underline cursor-pointer"
                >
                  {video.name}
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  <span>{video.size}</span>
                  <span className="mx-2">-</span>
                  <span>{formatDate(video.lastModified)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handlePlay(video)}
                    title="Play"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(video)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">
              {actionVideo?.name}
            </DialogTitle>
            <DialogDescription>
              What would you like to do with this video?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => actionVideo && handlePlay(actionVideo)}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              View Video
            </Button>
            <Button
              variant="outline"
              onClick={() => actionVideo && handleDownload(actionVideo)}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Video
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Player Modal */}
      <VideoPlayer
        videoUrl={playerVideoUrl}
        videoName={playerVideoName}
        loading={playerLoading}
        error={playerError}
        open={playerOpen}
        onOpenChange={handlePlayerOpenChange}
      />
    </>
  );
}
