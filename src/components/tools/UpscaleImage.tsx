"use client";

import { useEffect, useState } from "react";
import { useAccess } from "../Access";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["upscale-image"];

export default function UpscaleImage() {
  const f = useFiles("image", true);
  const r = useRun();
  const access = useAccess();
  const [scale, setScale] = useState<"2" | "4">("2");
  const { reset } = r;
  useEffect(() => reset(), [f.items, scale, reset]);
  const n = f.items.length;
  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      listHeading={n === 1 ? "Your photo" : `Your photos (${n})`}
      options={
        <Segmented
          legend="How much bigger"
          name="scale"
          value={scale}
          onChange={setScale}
          hint={scale === "2" ? "Photos up to 2,000 pixels wide." : "Photos up to 1,000 pixels wide; bigger ones are fitted first."}
          options={[
            { value: "2", label: "2x" },
            { value: "4", label: "4x" },
          ]}
        />
      }
      actionLabel={n > 1 ? `Upscale ${n} photos` : "Upscale photo"}
      busyLabel="Upscaling"
      canRun={n > 0}
      onRun={async () => {
        if (!(await access.allow())) return;
        const { upscalePhoto } = await import("@/lib/upscale");
        r.run(async (report) => {
          const out = [];
          for (let i = 0; i < n; i++) {
            out.push(await upscalePhoto(f.items[i].file, Number(scale) as 2 | 4, (p, l) => report((i + p) / n, n > 1 ? `${l ?? "Upscaling"} (photo ${i + 1} of ${n})` : l)));
          }
          return out;
        });
      }}
      zipName="readily-upscaled.zip"
      next={["compress-image", "restore-photo", "crop-image"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
