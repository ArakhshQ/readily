"use client";

import { useEffect, useState } from "react";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { watermarkPdf } from "@/lib/pdf-ops";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["watermark-pdf"];

const COLORS: { id: string; label: string; rgb: [number, number, number]; css: string }[] = [
  { id: "gray", label: "Gray", rgb: [0.45, 0.48, 0.55], css: "#737a8c" },
  { id: "red", label: "Red", rgb: [0.78, 0.16, 0.16], css: "#c72929" },
  { id: "blue", label: "Blue", rgb: [0.18, 0.36, 1], css: "#2f5bff" },
  { id: "black", label: "Black", rgb: [0.06, 0.1, 0.24], css: "#0f1b3d" },
];

type Layout = "diagonal" | "straight" | "tiled";

export default function WatermarkPdf() {
  const f = useFiles("pdf", false);
  const r = useRun();
  const [text, setText] = useState("CONFIDENTIAL");
  const [color, setColor] = useState("gray");
  const [opacity, setOpacity] = useState(25);
  const [size, setSize] = useState(64);
  const [layout, setLayout] = useState<Layout>("diagonal");

  const { reset } = r;
  useEffect(() => reset(), [f.items, text, color, opacity, size, layout, reset]);

  const item = f.items[0];
  const c = COLORS.find((x) => x.id === color)!;
  const tiled = layout === "tiled";
  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      reorder={false}
      listHeading="Your PDF"
      options={
        <>
          <div className="field">
            <label className="field-label" htmlFor="wtext">
              Watermark text
            </label>
            <input id="wtext" className="input" style={{ maxWidth: 420 }} value={text} maxLength={60} onChange={(e) => setText(e.target.value)} />
            <div className="chips" role="group" aria-label="Common watermarks">
              {["CONFIDENTIAL", "DRAFT", "COPY", "SAMPLE", "DO NOT COPY"].map((w) => (
                <button key={w} type="button" className="chip" aria-pressed={text === w} onClick={() => setText(w)}>
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div className="wm-preview" aria-hidden="true">
            <span
              style={{
                color: c.css,
                opacity: opacity / 100 + 0.1,
                transform: layout === "straight" ? "none" : "rotate(-35deg)",
                fontSize: Math.max(14, Math.min(40, size / (tiled ? 2.6 : 1.8))),
              }}
            >
              {text || " "}
            </span>
          </div>
          <Segmented
            legend="Layout"
            name="wlayout"
            value={layout}
            onChange={setLayout}
            options={[
              { value: "diagonal", label: "Diagonal" },
              { value: "straight", label: "Straight" },
              { value: "tiled", label: "Repeated" },
            ]}
          />
          <fieldset className="field">
            <legend>Color</legend>
            <div className="segmented">
              {COLORS.map((x) => (
                <label key={x.id}>
                  <input type="radio" name="wcolor" checked={color === x.id} onChange={() => setColor(x.id)} />
                  <span>
                    <i className="swatch" style={{ background: x.css }} />
                    {x.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="two-col">
            <div className="field">
              <label className="field-label" htmlFor="wop">
                Transparency
              </label>
              <div className="range-row">
                <input id="wop" type="range" min={5} max={90} step={5} value={opacity} onChange={(e) => setOpacity(parseInt(e.target.value, 10))} />
                <output htmlFor="wop">{opacity}%</output>
              </div>
              <p className="hint">Lower is fainter. 20 to 30% keeps pages readable.</p>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="wsize">
                Text size
              </label>
              <div className="range-row">
                <input id="wsize" type="range" min={20} max={120} step={2} value={size} onChange={(e) => setSize(parseInt(e.target.value, 10))} />
                <output htmlFor="wsize">{size} pt</output>
              </div>
            </div>
          </div>
        </>
      }
      actionLabel="Add watermark"
      busyLabel="Stamping pages"
      canRun={!!item && text.trim().length > 0}
      blockedReason="Type the watermark text first."
      onRun={() =>
        r.run(async () => [
          await watermarkPdf(item.file, {
            text,
            size: tiled ? Math.round(size * 0.6) : size,
            opacity: opacity / 100,
            color: c.rgb,
            diagonal: layout !== "straight",
            tile: tiled,
          }),
        ])
      }
      zipName="readily-watermarked.zip"
      next={["add-page-numbers", "compress-pdf", "merge-pdf"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
