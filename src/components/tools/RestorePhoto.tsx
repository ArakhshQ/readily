"use client";

import { ImageAiTool } from "./ImageAiTool";

export default function RestorePhoto() {
  return <ImageAiTool slug="restore-photo" maxSide={1600} suffix="restored" label="Restoring" action="Restore photo" checks={["Faces and detail restored", "2x sharper"]} next={["colorize-photo", "hd-photo-upscaler"]} />;
}
