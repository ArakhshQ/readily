"use client";

import { useState } from "react";
import { ImageAiTool } from "./ImageAiTool";

export default function PhotoToVideo() {
  const [prompt, setPrompt] = useState("");
  const [ok, setOk] = useState(false);
  return (
    <ImageAiTool
      slug="photo-to-video"
      maxSide={1280}
      suffix="video"
      label="Bringing your photo to life (about a minute)"
      action="Make video"
      deps={[prompt]}
      payload={{ prompt }}
      ready={{ ok, why: "Confirm you have the rights to this photo" }}
      checks={["5-second clip", "MP4"]}
      options={
        <>
          <div className="field">
            <label className="field-label" htmlFor="pv">
              Describe the motion (optional)
            </label>
            <input id="pv" className="input" maxLength={400} value={prompt} placeholder="e.g. the waves roll in and the camera slowly pushes forward" onChange={(e) => setPrompt(e.target.value)} />
          </div>
          <label className="check">
            <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> I have the rights to this photo, and I won&apos;t use the video to mislead anyone.
          </label>
        </>
      }
      next={["video-upscaler", "compress-video"]}
    />
  );
}
