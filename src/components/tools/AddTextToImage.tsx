"use client";

// Write text on a photo: type it, pick a style, drag it into place. The preview
// uses the same drawing code as the final full-resolution image.
import { useEffect, useRef, useState } from "react";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { baseName, canvasToBlob, formatBytes, loadImage } from "@/lib/files";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["add-text-to-image"];

type Font = "sans" | "serif" | "impact" | "hand";
type Style = "plain" | "outline" | "shadow" | "box";
const FONTS: Record<Font, { label: string; css: string; weight: number }> = {
  sans: { label: "Bold", css: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif", weight: 800 },
  serif: { label: "Classic", css: "Georgia, 'Times New Roman', serif", weight: 700 },
  impact: { label: "Poster", css: "Impact, 'Arial Black', 'Helvetica Neue', sans-serif", weight: 900 },
  hand: { label: "Handwritten", css: "'Segoe Script', 'Bradley Hand', 'Comic Sans MS', cursive", weight: 700 },
};
const COLORS = ["#ffffff", "#111111", "#ffd400", "#ff3b30", "#2f6bff", "#34c759"];

interface Opts {
  text: string;
  font: Font;
  size: number; // % of image width for the font size
  color: string;
  style: Style;
  x: number; // 0..1, centre of the text
  y: number;
}

/** Draws the text onto a canvas that already holds the photo. Returns the text's box. */
function drawText(ctx: CanvasRenderingContext2D, w: number, h: number, o: Opts) {
  const lines = o.text.split("\n");
  const px = Math.max(8, (o.size / 100) * w);
  const f = FONTS[o.font];
  ctx.font = `${f.weight} ${px}px ${f.css}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lh = px * 1.2;
  const widths = lines.map((l) => ctx.measureText(l).width);
  const boxW = Math.max(...widths, px);
  const boxH = lh * lines.length;
  const cx = o.x * w;
  const cy = o.y * h;
  const top = cy - boxH / 2;
  const dark = isDark(o.color);
  if (o.style === "box") {
    const pad = px * 0.35;
    ctx.fillStyle = dark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.6)";
    roundRect(ctx, cx - boxW / 2 - pad, top - pad * 0.6, boxW + pad * 2, boxH + pad * 1.2, pad * 0.6);
    ctx.fill();
  }
  lines.forEach((line, i) => {
    const ly = top + lh * i + lh / 2;
    if (o.style === "shadow") {
      ctx.shadowColor = dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.65)";
      ctx.shadowBlur = px * 0.25;
      ctx.shadowOffsetY = px * 0.06;
    }
    if (o.style === "outline") {
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(2, px * 0.12);
      ctx.strokeStyle = dark ? "#ffffff" : "#000000";
      ctx.strokeText(line, cx, ly);
    }
    ctx.fillStyle = o.color;
    ctx.fillText(line, cx, ly);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  });
  return { x: cx - boxW / 2, y: top, w: boxW, h: boxH };
}

function isDark(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function AddTextToImage() {
  const f = useFiles("image", false);
  const r = useRun();
  const [o, setO] = useState<Opts>({ text: "Your text here", font: "sans", size: 8, color: "#ffffff", style: "outline", x: 0.5, y: 0.85 });
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const item = f.items[0];
  const set = (p: Partial<Opts>) => setO((v) => ({ ...v, ...p }));

  useEffect(() => {
    setImg(null);
    setLoadErr(null);
    if (!item) return;
    loadImage(item.file)
      .then((im) => {
        setImg(im);
        f.setDetail(item.id, `${im.naturalWidth} × ${im.naturalHeight} px`);
      })
      .catch(() => setLoadErr("This image can't be opened here. Convert it to JPG first."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  // Preview: the photo scaled to fit, with the text drawn the same way as the final file.
  useEffect(() => {
    const c = canvas.current;
    if (!c || !img) return;
    const maxW = Math.min(900, c.parentElement?.clientWidth || 600);
    const scale = Math.min(1, maxW / img.naturalWidth);
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    if (o.text.trim()) drawText(ctx, c.width, c.height, o);
  }, [img, o]);

  const { reset } = r;
  useEffect(() => reset(), [f.items, o, reset]);

  function pos(e: React.PointerEvent) {
    const rect = canvas.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  }

  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      listHeading="Your image"
      options={
        <>
          {loadErr && <p className="msg-error">{loadErr}</p>}
          {img && (
            <div className="text-canvas">
              <canvas
                ref={canvas}
                aria-label="Preview. Drag the text to move it."
                onPointerDown={(e) => {
                  const p = pos(e);
                  drag.current = { dx: o.x - p.x, dy: o.y - p.y };
                  (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!drag.current) return;
                  const p = pos(e);
                  set({ x: Math.min(0.98, Math.max(0.02, p.x + drag.current.dx)), y: Math.min(0.98, Math.max(0.02, p.y + drag.current.dy)) });
                }}
                onPointerUp={() => (drag.current = null)}
              />
              <p className="hint">Drag the text to move it.</p>
            </div>
          )}
          <div className="field">
            <label className="field-label" htmlFor="tt">
              Text
            </label>
            <textarea id="tt" className="input" rows={2} maxLength={300} value={o.text} onChange={(e) => set({ text: e.target.value })} />
          </div>
          <Segmented
            legend="Position"
            name="tpos"
            value={o.y < 0.3 ? "top" : o.y > 0.7 ? "bottom" : "middle"}
            onChange={(v) => set({ x: 0.5, y: v === "top" ? 0.12 : v === "bottom" ? 0.88 : 0.5 })}
            options={[
              { value: "top", label: "Top" },
              { value: "middle", label: "Middle" },
              { value: "bottom", label: "Bottom" },
            ]}
          />
          <Segmented
            legend="Font"
            name="tfont"
            value={o.font}
            onChange={(v) => set({ font: v })}
            options={(Object.keys(FONTS) as Font[]).map((k) => ({ value: k, label: FONTS[k].label }))}
          />
          <Segmented
            legend="Style"
            name="tstyle"
            value={o.style}
            onChange={(v) => set({ style: v })}
            options={[
              { value: "outline", label: "Outline" },
              { value: "box", label: "Background" },
              { value: "shadow", label: "Shadow" },
              { value: "plain", label: "Plain" },
            ]}
          />
          <div className="field">
            <label className="field-label" htmlFor="tsize">
              Size
            </label>
            <input id="tsize" type="range" min={2} max={20} step={0.5} value={o.size} onChange={(e) => set({ size: Number(e.target.value) })} />
          </div>
          <fieldset className="field">
            <legend className="field-label">Colour</legend>
            <div className="swatches">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`swatch${o.color === c ? " on" : ""}`}
                  style={{ background: c }}
                  aria-label={`Colour ${c}`}
                  aria-pressed={o.color === c}
                  onClick={() => set({ color: c })}
                />
              ))}
              <input type="color" aria-label="Any colour" value={o.color} onChange={(e) => set({ color: e.target.value })} />
            </div>
          </fieldset>
        </>
      }
      actionLabel="Add text"
      busyLabel="Adding text"
      canRun={!!img && !!o.text.trim()}
      blockedReason={!img ? "Opening the image…" : "Type some text"}
      onRun={() =>
        r.run(async (report) => {
          report(0.2, "Adding text");
          const c = document.createElement("canvas");
          c.width = img!.naturalWidth;
          c.height = img!.naturalHeight;
          const ctx = c.getContext("2d")!;
          ctx.drawImage(img!, 0, 0);
          drawText(ctx, c.width, c.height, o);
          const png = /png|webp|gif/i.test(item.file.type) || /\.(png|webp|gif)$/i.test(item.file.name);
          const blob = await canvasToBlob(c, png ? "image/png" : "image/jpeg", 0.92);
          return [{ blob, name: `${baseName(item.file.name)} (with text).${png ? "png" : "jpg"}`, checks: ["Text added", `${c.width} × ${c.height} px, full size`, formatBytes(blob.size)] }];
        })
      }
      zipName="readily-text.zip"
      next={["compress-image", "resize-image", "crop-image"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
