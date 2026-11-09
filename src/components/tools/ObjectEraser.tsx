"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccess } from "../Access";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { baseName, canvasToBlob, formatBytes, loadImage } from "@/lib/files";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["object-eraser"];
const MAX_SIDE = 4096;

export default function ObjectEraser() {
  const f = useFiles("image", false);
  const r = useRun();
  const access = useAccess();
  const view = useRef<HTMLCanvasElement>(null);
  const paint = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLCanvasElement | null>(null);
  const [history, setHistory] = useState<HTMLCanvasElement[]>([]);
  const [brush, setBrush] = useState(28);
  const [painted, setPainted] = useState(false);
  const drawing = useRef<{ x: number; y: number } | null>(null);
  const item = f.items[0];
  const { reset } = r;

  // Load the chosen photo into a working canvas.
  useEffect(() => {
    setImage(null);
    setHistory([]);
    setPainted(false);
    reset();
    if (!item) return;
    loadImage(item.file)
      .then((img) => {
        const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        setImage(c);
      })
      .catch((e) => r.setError(e instanceof Error ? e.message : "This image couldn't be opened."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  // Show the current image and size the paint layer to match.
  useEffect(() => {
    if (!image || !view.current || !paint.current) return;
    view.current.width = image.width;
    view.current.height = image.height;
    view.current.getContext("2d")!.drawImage(image, 0, 0);
    paint.current.width = image.width;
    paint.current.height = image.height;
    setPainted(false);
  }, [image]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget;
    const rect = c.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * c.width, y: ((e.clientY - rect.top) / rect.height) * c.height, k: c.width / rect.width };
  };
  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }, k: number) => {
    const ctx = paint.current!.getContext("2d")!;
    ctx.strokeStyle = "rgba(255, 51, 85, 0.55)";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brush * k;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + 0.01, to.y);
    ctx.stroke();
  };

  const clearPaint = useCallback(() => {
    if (!paint.current) return;
    paint.current.getContext("2d")!.clearRect(0, 0, paint.current.width, paint.current.height);
    setPainted(false);
  }, []);

  async function erase() {
    if (!image || !paint.current || !painted) return;
    if (!(await access.allow())) return;
    const { eraseRegion } = await import("@/lib/ai-image");
    const before = image;
    const mask = paint.current;
    r.run(async (report) => {
      const out = await eraseRegion(before, mask, (s) => report(0.3, s));
      setHistory((h) => [...h, before]);
      setImage(out);
      const png = /png/i.test(item.file.type);
      const blob = await canvasToBlob(out, png ? "image/png" : "image/jpeg", png ? undefined : 0.95);
      return [{ blob, name: `${baseName(item.file.name)} (erased).${png ? "png" : "jpg"}`, checks: ["Painted area erased", `${out.width} × ${out.height}`, formatBytes(blob.size)] }];
    });
  }

  function undo() {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setImage(prev);
      reset();
      return h.slice(0, -1);
    });
  }

  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      hideList
      listHeading="Your photo"
      options={
        image && (
          <div className="eraser">
            <div className="eraser-tools">
              <label className="field-label" htmlFor="brush">
                Brush size
              </label>
              <input id="brush" type="range" min={8} max={90} value={brush} onChange={(e) => setBrush(Number(e.target.value))} />
              <button type="button" className="btn btn-quiet btn-small" onClick={clearPaint} disabled={!painted}>
                Clear paint
              </button>
              <button type="button" className="btn btn-quiet btn-small" onClick={undo} disabled={!history.length || r.busy}>
                Undo erase
              </button>
            </div>
            <div className="eraser-stage">
              <canvas ref={view} className="eraser-img" aria-label="Your photo" />
              <canvas
                ref={paint}
                className="eraser-paint"
                aria-label="Paint over what to erase"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const p = pos(e);
                  drawing.current = p;
                  stroke(p, p, p.k);
                  setPainted(true);
                  if (r.outputs) reset();
                }}
                onPointerMove={(e) => {
                  if (!drawing.current) return;
                  const p = pos(e);
                  stroke(drawing.current, p, p.k);
                  drawing.current = p;
                }}
                onPointerUp={() => (drawing.current = null)}
                onPointerCancel={() => (drawing.current = null)}
              />
            </div>
            <p className="hint">Paint over what you want gone. You can erase again as many times as you like.</p>
          </div>
        )
      }
      actionLabel="Erase painted area"
      busyLabel="Erasing"
      canRun={!!image && painted}
      blockedReason={image && !painted ? "Paint over something first" : undefined}
      onRun={erase}
      zipName="readily-erased.zip"
      next={["compress-image", "crop-image", "remove-background"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
