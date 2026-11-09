"use client";

import { VideoAiTool } from "./VideoAiTool";

export default function VideoBackgroundRemover() {
  return (
    <VideoAiTool
      slug="video-background-remover"
      maxMinutes={5}
      maxHeight={720}
      suffix="green screen"
      label="Removing the background (a few minutes)"
      action="Remove background"
      checks={["Person on a green screen", "Ready for chroma key"]}
      next={["compress-video", "trim-video"]}
    />
  );
}
