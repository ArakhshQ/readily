"use client";

import { useEffect, useRef, useState } from "react";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { cropImage, imageSize, type OutFormat } from "@/lib/image-ops";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["crop-image"];

const RATIOS = [
  { id: "free", label: "Free", r: 0 },
  { id: "1:1", label: "Square 1:1", r: 1 },
  { id: "4:5", label: "Portrait 4:5", r: 4 / 5 },
  { id: "3:4", label: "3:4", r: 3 / 4 },
  { id: "16:9", label: "Wide 16:9", r: 16 / 9 },
  { id: "9:16", label: "Story 9:16", r: 9 / 16 },
];

type Rect = { x: number; y: number; w: number; h: number };
type Corner = "nw" | "ne" | "sw" | "se";

function fitRatio(W: number, H: number, r: number): Rect {
  if (!r) return { x: W * 0.1, y: H * 0.1, w: W * 0.8, h: H * 0.8 };
  let w = W;
  let h = w / r;
  if (h > H) {
    h = H;
    w = h * r;
  }
  w *= 0.9;
  h *= 0.9;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}

export default function CropImage() {
  const f = useFiles("image", false);
  const r = useRun();
  const [url, setUrl] = useState<string | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [ratio, setRatio] = useState("free");
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 1, h: 1 });
  const [format, setFormat] = useState<OutFormat | "same">("same");
  const stage = useRef<HTMLDivElement>(null);
  const action = useRef<{ kind: "move" | Corner; sx: number; sy: number; start: Rect } | null>(null);

  const item = f.items[0];
  useEffect(() => {
    setUrl(null);
    setNat(null);
    if (!item) return;
    const u = URL.createObjectURL(item.file);
    setUrl(u);
    imageSize(item.file)
      .then((s) => {
        setNat(s);
        setRect(fitRatio(s.w, s.h, 0));
        setRatio("free");
      })
      .catch((e) => r.setError(e instanceof Error ? e.message : "This image couldn't be opened."));
    return () => URL.revokeObjectURL(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const { reset } = r;
  useEffect(() => reset(), [f.items, rect, format, reset]);

  const R = RATIOS.find((x) => x.id === ratio)!.r;

  function scale() {
    const el = stage.current;
    return el && nat ? nat.w / el.getBoundingClientRect().width : 1;
  }

  function onMove(e: React.PointerEvent) {
    const a = action.current;
    if (!a || !nat) return;
    const k = scale();
    const dx = (e.clientX - a.sx) * k;
    const dy = (e.clientY - a.sy) * k;
    const s = a.start;
    if (a.kind === "move") {
      setRect({ ...s, x: Math.min(Math.max(0, s.x + dx), nat.w - s.w), y: Math.min(Math.max(0, s.y + dy), nat.h - s.h) });
      return;
    }
    // Resize from the dragged corner, keeping the opposite corner fixed.
    const left = a.kind === "nw" || a.kind === "sw";
    const top = a.kind === "nw" || a.kind === "ne";
    const ax = left ? s.x + s.w : s.x;
    const ay = top ? s.y + s.h : s.y;
    let w = Math.max(16, left ? s.w - dx : s.w + dx);
    let h = Math.max(16, top ? s.h - dy : s.h + dy);
    if (R) {
      if (w / h > R) w = h * R;
      else h = w / R;
    }
    w = Math.min(w, left ? ax : nat.w - ax);
    h = Math.min(h, top ? ay : nat.h - ay);
    if (R) {
      if (w / h > R) w = h * R;
      else h = w / R;
    }
    setRect({ x: left ? ax - w : ax, y: top ? ay - h : ay, w, h });
  }

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;

  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      reorder={false}
      listHeading="Image to crop"
      options={
        nat && url ? (
          <>
            <fieldset className="field">
              <legend>Shape</legend>
              <div className="chips" style={{ marginTop: 0 }}>
                {RATIOS.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    className="chip"
                    aria-pressed={ratio === x.id}
                    onClick={() => {
                      setRatio(x.id);
                      setRect(fitRatio(nat.w, nat.h, x.r));
                    }}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="crop-wrap">
              <div ref={stage} className="crop-stage" onPointerMove={onMove} onPointerUp={() => (action.current = null)} onPointerLeave={() => (action.current = null)}>
                <img src={url} alt="Image being cropped" draggable={false} />
                <div
                  className="crop-box"
                  style={{ left: pct(rect.x, nat.w), top: pct(rect.y, nat.h), width: pct(rect.w, nat.w), height: pct(rect.h, nat.h) }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    (e.currentTarget.parentElement as HTMLElement).setPointerCapture(e.pointerId);
                    const kind = ((e.target as HTMLElement).dataset.corner as Corner) || "move";
                    action.current = { kind, sx: e.clientX, sy: e.clientY, start: rect };
                  }}
                >
                  {(["nw", "ne", "sw", "se"] as Corner[]).map((c) => (
                    <span key={c} className={`crop-handle ${c}`} data-corner={c} aria-hidden="true" />
                  ))}
                </div>
              </div>
            </div>
            <p className="hint">
              Crop area {Math.round(rect.w)} × {Math.round(rect.h)} px. Drag inside to move, drag a corner to resize.
            </p>
            <Segmented
              legend="Save as"
              name="cropfmt"
              value={format}
              onChange={setFormat}
              options={[
                { value: "same", label: "Same as original" },
                { value: "image/jpeg", label: "JPG" },
                { value: "image/png", label: "PNG" },
                { value: "image/webp", label: "WebP" },
              ]}
            />
          </>
        ) : (
          <p className="hint">Opening your image…</p>
        )
      }
      actionLabel="Crop image"
      busyLabel="Cropping"
      canRun={!!item && !!nat}
      onRun={() => r.run(async () => [await cropImage(item.file, rect, format)])}
      zipName="readily-cropped.zip"
      next={["resize-image", "compress-image", "jpg-to-pdf"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
