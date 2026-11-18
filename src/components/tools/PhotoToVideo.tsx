"use client";

import { useState } from "react";
import { ImageAiTool } from "./ImageAiTool";

export default function PhotoToVideo() {
  const [prompt, setPrompt] = useState("");
  return (
    <ImageAiTool
      slug="photo-to-video"
      maxSide={1280}
      suffix="video"
      label="Bringing your photo to life (about a minute)"
      action="Make video"
      deps={[prompt]}
      payload={{ prompt }}
      checks={["5-second clip", "MP4"]}
      options={
        <>
          <div className="field">
            <label className="field-label" htmlFor="pv">
              Describe the motion (optional)
            </label>
            <input id="pv" className="input" maxLength={400} value={prompt} placeholder="e.g. the waves roll in and the camera slowly pushes forward" onChange={(e) => setPrompt(e.target.value)} />
          </div>
        </>
      }
      next={["video-upscaler", "compress-video"]}
    />
  );
}
