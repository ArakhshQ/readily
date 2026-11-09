"use client";

import { useState } from "react";
import { ImageAiTool } from "./ImageAiTool";

export default function HdPhotoUpscaler() {
  const [faces, setFaces] = useState(true);
  return (
    <ImageAiTool
      slug="hd-photo-upscaler"
      maxSide={1500}
      suffix="HD 4x"
      label="Upscaling on a GPU"
      action="Upscale to HD"
      deps={[faces]}
      payload={{ faces }}
      checks={["4x bigger", faces ? "Faces fixed" : "Faces untouched"]}
      options={
        <label className="check">
          <input type="checkbox" checked={faces} onChange={(e) => setFaces(e.target.checked)} /> Fix faces (best for portraits)
        </label>
      }
      next={["compress-image", "colorize-photo"]}
    />
  );
}
