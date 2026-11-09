"use client";

import { useEffect, useState } from "react";
import { useAccess } from "../Access";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["remove-background"];

export default function RemoveBackground() {
  const f = useFiles("image", true);
  const r = useRun();
  const access = useAccess();
  const [bg, setBg] = useState<"transparent" | "white" | "color">("transparent");
  const [color, setColor] = useState("#2f5bff");
  const { reset } = r;
  useEffect(() => reset(), [f.items, bg, color, reset]);
  const n = f.items.length;

  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      listHeading={n === 1 ? "Your photo" : `Your photos (${n})`}
      options={
        <>
          <Segmented
            legend="Background"
            name="bg"
            value={bg}
            onChange={setBg}
            options={[
              { value: "transparent", label: "Transparent (PNG)" },
              { value: "white", label: "White (JPG)" },
              { value: "color", label: "A colour" },
            ]}
          />
          {bg === "color" && (
            <div className="field">
              <label className="field-label" htmlFor="bgc">
                Colour
              </label>
              <input id="bgc" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="input-color" />
            </div>
          )}
        </>
      }
      actionLabel={n > 1 ? `Remove ${n} backgrounds` : "Remove background"}
      busyLabel="Removing background"
      canRun={n > 0}
      onRun={async () => {
        if (!(await access.allow())) return;
        const { removeBackground } = await import("@/lib/ai-image");
        r.run(async (report) => {
          const out = [];
          for (let i = 0; i < n; i++) {
            report(i / n, `Photo ${i + 1} of ${n}`);
            out.push(
              await removeBackground(
                f.items[i].file,
                bg === "transparent" ? { kind: "transparent" } : { kind: "color", color: bg === "white" ? "#ffffff" : color },
                (s) => report(i / n, n > 1 ? `${s} (photo ${i + 1} of ${n})` : s),
              ),
            );
          }
          return out;
        });
      }}
      zipName="readily-no-background.zip"
      next={["product-photo-backgrounds", "compress-image", "crop-image"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
