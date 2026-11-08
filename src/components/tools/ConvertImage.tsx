"use client";

import { useEffect, useState } from "react";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { convertImage, FORMAT_LABEL, type OutFormat } from "@/lib/image-ops";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["convert-image"];

export default function ConvertImage() {
  const f = useFiles("image", true);
  const r = useRun();
  const [format, setFormat] = useState<OutFormat>("image/jpeg");
  const [quality, setQuality] = useState(92);

  const { reset } = r;
  useEffect(() => reset(), [f.items, format, quality, reset]);

  const n = f.items.length;
  const lossy = format !== "image/png";
  return (
    <Workspace
      tool={tool}
      {...f}
      reorder={false}
      listHeading="Images to convert"
      options={
        <>
          <Segmented
            legend="Convert to"
            name="tformat"
            value={format}
            onChange={setFormat}
            options={[
              { value: "image/jpeg", label: "JPG" },
              { value: "image/png", label: "PNG" },
              { value: "image/webp", label: "WebP" },
            ]}
            hint={
              format === "image/jpeg"
                ? "Works everywhere. Transparent areas become white."
                : format === "image/png"
                  ? "Keeps transparency and sharp edges. Files are larger."
                  : "Small files with transparency. Works in all modern browsers and most apps."
            }
          />
          {lossy && (
            <div className="field">
              <label className="field-label" htmlFor="cq">
                Quality
              </label>
              <div className="range-row" style={{ maxWidth: 480 }}>
                <input id="cq" type="range" min={50} max={100} step={1} value={quality} onChange={(e) => setQuality(parseInt(e.target.value, 10))} />
                <output htmlFor="cq">{quality}%</output>
              </div>
            </div>
          )}
        </>
      }
      actionLabel={`Convert to ${FORMAT_LABEL[format]}`}
      busyLabel="Converting"
      canRun={n > 0}
      summary={`${n} ${n === 1 ? "image" : "images"} to ${FORMAT_LABEL[format]}`}
      onRun={() =>
        r.run(async (report) => {
          const out = [];
          for (let i = 0; i < n; i++) {
            out.push(await convertImage(f.items[i].file, format, quality / 100));
            report((i + 1) / n);
          }
          return out;
        })
      }
      busy={r.busy}
      progress={r.progress}
      error={r.error}
      outputs={r.outputs}
      zipName="readily-converted.zip"
      next={["compress-image", "resize-image", "jpg-to-pdf"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
