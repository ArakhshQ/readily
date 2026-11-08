"use client";

import { useEffect, useState } from "react";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { heicToImage } from "@/lib/image-ops";
import type { Output } from "@/lib/files";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["heic-to-jpg"];

export default function HeicToJpg() {
  const f = useFiles("heic", true);
  const r = useRun();
  const [format, setFormat] = useState<"image/jpeg" | "image/png">("image/jpeg");

  const { reset } = r;
  useEffect(() => reset(), [f.items, format, reset]);

  const n = f.items.length;
  const label = format === "image/png" ? "PNG" : "JPG";
  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      reorder={false}
      listHeading="Photos to convert"
      options={
        <Segmented
          legend="Convert to"
          name="hfmt"
          value={format}
          onChange={setFormat}
          options={[
            { value: "image/jpeg", label: "JPG" },
            { value: "image/png", label: "PNG" },
          ]}
          hint={format === "image/jpeg" ? "Opens and uploads everywhere. Best for sharing." : "Lossless and much larger. Best for editing."}
        />
      }
      actionLabel={n > 1 ? `Convert ${n} photos to ${label}` : `Convert to ${label}`}
      busyLabel="Converting photos"
      canRun={n > 0}
      onRun={() =>
        r.run(async (report) => {
          const out: Output[] = [];
          for (let i = 0; i < n; i++) {
            report(i / n, `Converting ${f.items[i].file.name}`);
            out.push(...(await heicToImage(f.items[i].file, format)));
          }
          return out;
        })
      }
      zipName="readily-photos.zip"
      next={["compress-image", "jpg-to-pdf", "resize-image"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
