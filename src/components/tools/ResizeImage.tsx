"use client";

import { useEffect, useRef, useState } from "react";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { imageSize, resizeImage, type FitMode, type OutFormat } from "@/lib/image-ops";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["resize-image"];

const PRESETS = [
  { label: "Passport 600 × 600", w: 600, h: 600 },
  { label: "Profile 400 × 400", w: 400, h: 400 },
  { label: "Square post 1080 × 1080", w: 1080, h: 1080 },
  { label: "Portrait post 1080 × 1350", w: 1080, h: 1350 },
  { label: "Story 1080 × 1920", w: 1080, h: 1920 },
  { label: "Full HD 1920 × 1080", w: 1920, h: 1080 },
];

type Mode = "pixels" | "percent";

export default function ResizeImage() {
  const f = useFiles("image", true);
  const r = useRun();
  const [mode, setMode] = useState<Mode>("pixels");
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(800);
  const [lock, setLock] = useState(true);
  const [percent, setPercent] = useState(50);
  const [fit, setFit] = useState<FitMode>("crop");
  const [format, setFormat] = useState<OutFormat | "same">("same");
  const [first, setFirst] = useState<{ w: number; h: number } | null>(null);
  const sizes = useRef(new Map<string, { w: number; h: number }>());

  const { items, setDetail } = f;
  useEffect(() => {
    for (const it of items) {
      if (sizes.current.has(it.id)) continue;
      sizes.current.set(it.id, { w: 0, h: 0 });
      imageSize(it.file)
        .then((s) => {
          sizes.current.set(it.id, s);
          setDetail(it.id, `${s.w} × ${s.h} px`);
        })
        .catch(() => setDetail(it.id, "can't be opened"));
    }
  }, [items, setDetail]);

  // Start the width/height boxes from the first image's real size.
  const firstId = items[0]?.id;
  useEffect(() => {
    if (!firstId) {
      setFirst(null);
      return;
    }
    const s = items[0];
    imageSize(s.file)
      .then((d) => {
        setFirst(d);
        setWidth(d.w);
        setHeight(d.h);
      })
      .catch(() => setFirst(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstId]);

  const { reset } = r;
  useEffect(() => reset(), [items, mode, width, height, lock, percent, fit, format, reset]);

  const ratio = first ? first.w / first.h : width / Math.max(1, height);
  const n = items.length;
  const valid = mode === "percent" ? percent >= 1 && percent <= 400 : width >= 1 && height >= 1 && width <= 12000 && height <= 12000;

  return (
    <Workspace
      tool={tool}
      {...f}
      reorder={false}
      listHeading="Images to resize"
      options={
        <>
          <Segmented
            legend="Resize by"
            name="rmode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "pixels", label: "Exact pixels" },
              { value: "percent", label: "Percentage" },
            ]}
          />
          {mode === "pixels" ? (
            <div className="field">
              <span className="field-label">New size</span>
              <div className="input-row">
                <div className="input-unit">
                  <input
                    type="number"
                    min={1}
                    max={12000}
                    value={width}
                    aria-label="Width in pixels"
                    onChange={(e) => {
                      const w = Math.max(0, parseInt(e.target.value || "0", 10));
                      setWidth(w);
                      if (lock) setHeight(Math.max(1, Math.round(w / ratio)));
                    }}
                  />
                  <span className="unit">W px</span>
                </div>
                <span aria-hidden="true">×</span>
                <div className="input-unit">
                  <input
                    type="number"
                    min={1}
                    max={12000}
                    value={height}
                    aria-label="Height in pixels"
                    onChange={(e) => {
                      const h = Math.max(0, parseInt(e.target.value || "0", 10));
                      setHeight(h);
                      if (lock) setWidth(Math.max(1, Math.round(h * ratio)));
                    }}
                  />
                  <span className="unit">H px</span>
                </div>
              </div>
              <label className="check" style={{ marginTop: 12 }}>
                <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} />
                Keep the original shape
              </label>
              <div className="chips" role="group" aria-label="Common sizes">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className="chip"
                    aria-pressed={!lock && width === p.w && height === p.h}
                    onClick={() => {
                      setLock(false);
                      setWidth(p.w);
                      setHeight(p.h);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {first && <p className="hint">Original: {first.w} × {first.h} px{n > 1 ? " (first image)" : ""}.</p>}
            </div>
          ) : (
            <div className="field">
              <label className="field-label" htmlFor="pct">
                Scale to
              </label>
              <div className="range-row" style={{ maxWidth: 480 }}>
                <input id="pct" type="range" min={5} max={200} step={5} value={percent} onChange={(e) => setPercent(parseInt(e.target.value, 10))} />
                <output htmlFor="pct">{percent}%</output>
              </div>
              {first && (
                <p className="hint">
                  {first.w} × {first.h} becomes {Math.max(1, Math.round((first.w * percent) / 100))} × {Math.max(1, Math.round((first.h * percent) / 100))} px
                  {n > 1 ? " for the first image" : ""}.
                </p>
              )}
            </div>
          )}
          <div className="two-col">
            {mode === "pixels" && !lock && (
              <Segmented
                legend="If the shape is different"
                name="fit"
                value={fit}
                onChange={setFit}
                options={[
                  { value: "crop", label: "Crop to fill" },
                  { value: "fit", label: "Fit with border" },
                  { value: "stretch", label: "Stretch" },
                ]}
              />
            )}
            <Segmented
              legend="Save as"
              name="rformat"
              value={format}
              onChange={setFormat}
              options={[
                { value: "same", label: "Same as original" },
                { value: "image/jpeg", label: "JPG" },
                { value: "image/png", label: "PNG" },
                { value: "image/webp", label: "WebP" },
              ]}
            />
          </div>
        </>
      }
      actionLabel={n > 1 ? `Resize ${n} images` : "Resize image"}
      busyLabel="Resizing"
      canRun={n > 0 && valid}
      blockedReason={!valid ? "Enter a size between 1 and 12,000 pixels." : undefined}
      summary={mode === "percent" ? `${percent}% of the original size` : lock ? `${width} px wide, original shape kept` : `${width} × ${height} px`}
      onRun={() =>
        r.run(async (report) => {
          const out = [];
          for (let i = 0; i < n; i++) {
            const it = items[i];
            const s = sizes.current.get(it.id)?.w ? sizes.current.get(it.id)! : await imageSize(it.file);
            let w: number;
            let h: number;
            let m: FitMode = fit;
            if (mode === "percent") {
              w = Math.max(1, Math.round((s.w * percent) / 100));
              h = Math.max(1, Math.round((s.h * percent) / 100));
              m = "stretch";
            } else if (lock) {
              // Each image keeps its own shape at the chosen width.
              w = width;
              h = Math.max(1, Math.round((width * s.h) / s.w));
              m = "stretch";
            } else {
              w = width;
              h = height;
            }
            out.push(await resizeImage(it.file, { width: w, height: h, mode: m, format }));
            report((i + 1) / n);
          }
          return out;
        })
      }
      busy={r.busy}
      progress={r.progress}
      error={r.error}
      outputs={r.outputs}
      zipName="readily-resized.zip"
      next={["compress-image", "jpg-to-pdf", "convert-image"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
