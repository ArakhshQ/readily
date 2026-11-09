"use client";

import { useState } from "react";
import { Segmented } from "../Segmented";
import { VideoAiTool } from "./VideoAiTool";

export default function VideoUpscaler() {
  const [target, setTarget] = useState<"1080p" | "4k">("1080p");
  return (
    <VideoAiTool
      slug="video-upscaler"
      maxMinutes={3}
      maxHeight={1080}
      suffix={target}
      label="Upscaling your video (a few minutes)"
      action="Upscale video"
      deps={[target]}
      payload={{ target }}
      checks={[`Upscaled to ${target === "4k" ? "4K" : "1080p"}`]}
      options={
        <Segmented
          legend="Upscale to"
          name="t"
          value={target}
          onChange={setTarget}
          options={[
            { value: "1080p", label: "1080p (Full HD)" },
            { value: "4k", label: "4K" },
          ]}
        />
      }
      next={["compress-video", "trim-video"]}
    />
  );
}
