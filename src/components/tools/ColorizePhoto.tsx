"use client";

import { ImageAiTool } from "./ImageAiTool";

export default function ColorizePhoto() {
  return <ImageAiTool slug="colorize-photo" maxSide={2048} suffix="colour" label="Adding colour" action="Colorize photo" checks={["Natural colour added"]} next={["restore-photo", "hd-photo-upscaler"]} />;
}
