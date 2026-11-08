"use client";

import { useEffect, useState } from "react";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { compressImage, type OutFormat } from "@/lib/image-ops";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["compress-image"];

const PRESETS: { label: string; value: number; unit: Unit }[] = [
  { label: "50 KB", value: 50, unit: "KB" },
  { label: "100 KB", value: 100, unit: "KB" },
  { label: "200 KB", value: 200, unit: "KB" },
  { label: "500 KB", value: 500, unit: "KB" },
  { label: "1 MB", value: 1, unit: "MB" },
  { label: "2 MB", value: 2, unit: "MB" },
];

type Unit = "KB" | "MB";
type Mode = "target" | "quality";

// Sizes use 1 KB = 1000 bytes, the stricter reading of upload limits,
// so a file that fits here also fits forms that count 1 KB as 1024 bytes.
const toBytes = (v: number, u: Unit) => Math.floor(v * (u === "KB" ? 1000 : 1_000_000));

export default function CompressImage() {
  const f = useFiles("image", true);
  const r = useRun();
  const [mode, setMode] = useState<Mode>("target");
  const [value, setValue] = useState(200);
  const [unit, setUnit] = useState<Unit>("KB");
  const [quality, setQuality] = useState(75);
  const [format, setFormat] = useState<OutFormat | "auto">("auto");

  const { reset } = r;
  useEffect(() => reset(), [f.items, mode, value, unit, quality, format, reset]);

  const n = f.items.length;
  const valid = mode === "quality" || (value > 0 && toBytes(value, unit) >= 5000);
  const label = `${value} ${unit}`;

  return (
    <Workspace
      tool={tool}
      {...f}
      reorder={false}
      listHeading="Images to compress"
      options={
        <>
          <Segmented
            legend="Compress by"
            name="cmode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "target", label: "Target file size" },
              { value: "quality", label: "Quality level" },
            ]}
          />
          {mode === "target" ? (
            <div className="field">
              <label className="field-label" htmlFor="target">
                Make each image smaller than
              </label>
              <div className="input-unit" style={{ width: "fit-content" }}>
                <input
                  id="target"
                  type="number"
                  min={1}
                  step="any"
                  value={value}
                  onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                  aria-describedby="target-hint"
                />
                <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} aria-label="Unit">
                  <option>KB</option>
                  <option>MB</option>
                </select>
              </div>
              <div className="chips" role="group" aria-label="Common sizes">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className="chip"
                    aria-pressed={value === p.value && unit === p.unit}
                    onClick={() => {
                      setValue(p.value);
                      setUnit(p.unit);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="hint" id="target-hint">
                {valid ? "Readily keeps the best quality that fits under this size." : "Pick a target of at least 5 KB."}
              </p>
            </div>
          ) : (
            <div className="field">
              <label className="field-label" htmlFor="quality">
                Quality
              </label>
              <div className="range-row" style={{ maxWidth: 480 }}>
                <input id="quality" type="range" min={20} max={95} step={1} value={quality} onChange={(e) => setQuality(parseInt(e.target.value, 10))} />
                <output htmlFor="quality">{quality}%</output>
              </div>
              <p className="hint">75% looks nearly identical to the original for most photos and is much smaller.</p>
            </div>
          )}
          <Segmented
            legend="Save as"
            name="cformat"
            value={format}
            onChange={setFormat}
            options={[
              { value: "auto", label: "Best fit" },
              { value: "image/jpeg", label: "JPG" },
              { value: "image/webp", label: "WebP" },
            ]}
            hint="Best fit keeps JPG and WebP as they are and saves other images as JPG, which works on every form."
          />
        </>
      }
      actionLabel={n > 1 ? `Compress ${n} images` : "Compress image"}
      busyLabel="Finding the best quality that fits"
      canRun={n > 0 && valid}
      blockedReason={!valid ? "Pick a target of at least 5 KB." : undefined}
      summary={mode === "target" ? `Each image under ${label}` : `Quality ${quality}%`}
      onRun={() =>
        r.run(async (report) => {
          const out = [];
          for (let i = 0; i < n; i++) {
            out.push(
              await compressImage(f.items[i].file, {
                targetBytes: mode === "target" ? toBytes(value, unit) : null,
                targetLabel: label,
                quality: quality / 100,
                format,
              }),
            );
            report((i + 1) / n);
          }
          return out;
        })
      }
      busy={r.busy}
      progress={r.progress}
      error={r.error}
      outputs={r.outputs}
      zipName="readily-compressed.zip"
      next={["jpg-to-pdf", "resize-image", "convert-image"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
