"use client";

import { useEffect, useState } from "react";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { addPageNumbers, type NumberFormat, type NumberPosition } from "@/lib/pdf-ops";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["add-page-numbers"];

const POSITIONS: { value: NumberPosition; label: string }[] = [
  { value: "tl", label: "Top left" },
  { value: "tc", label: "Top center" },
  { value: "tr", label: "Top right" },
  { value: "bl", label: "Bottom left" },
  { value: "bc", label: "Bottom center" },
  { value: "br", label: "Bottom right" },
];

export default function AddPageNumbers() {
  const f = useFiles("pdf", false);
  const r = useRun();
  const [position, setPosition] = useState<NumberPosition>("bc");
  const [format, setFormat] = useState<NumberFormat>("n");
  const [start, setStart] = useState(1);
  const [size, setSize] = useState<"10" | "12" | "16">("12");
  const [skipFirst, setSkipFirst] = useState(false);

  const { reset } = r;
  useEffect(() => reset(), [f.items, position, format, start, size, skipFirst, reset]);

  const item = f.items[0];
  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      reorder={false}
      listHeading="Your PDF"
      options={
        <>
          <fieldset className="field">
            <legend>Position</legend>
            <div className="pos-grid" role="radiogroup">
              {POSITIONS.map((p) => (
                <label key={p.value} className={position === p.value ? "on" : ""}>
                  <input type="radio" name="pos" value={p.value} checked={position === p.value} onChange={() => setPosition(p.value)} />
                  <span className="sr-only">{p.label}</span>
                  <span className={`pos-dot pos-${p.value}`} aria-hidden="true" />
                </label>
              ))}
            </div>
            <p className="hint">{POSITIONS.find((p) => p.value === position)?.label}</p>
          </fieldset>
          <div className="two-col">
            <div className="field">
              <label className="field-label" htmlFor="nfmt">
                Style
              </label>
              <select id="nfmt" className="select select-inline" value={format} onChange={(e) => setFormat(e.target.value as NumberFormat)}>
                <option value="n">1, 2, 3</option>
                <option value="page-n">Page 1, Page 2</option>
                <option value="page-n-of">Page 1 of 10</option>
                <option value="n-of">1 / 10</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="nstart">
                First number
              </label>
              <div className="input-unit" style={{ width: "fit-content" }}>
                <input id="nstart" type="number" min={0} max={99999} value={start} onChange={(e) => setStart(Math.max(0, parseInt(e.target.value || "0", 10)))} />
              </div>
            </div>
          </div>
          <Segmented
            legend="Size"
            name="nsize"
            value={size}
            onChange={setSize}
            options={[
              { value: "10", label: "Small" },
              { value: "12", label: "Medium" },
              { value: "16", label: "Large" },
            ]}
          />
          <label className="check">
            <input type="checkbox" checked={skipFirst} onChange={(e) => setSkipFirst(e.target.checked)} />
            Skip the first page (cover)
          </label>
        </>
      }
      actionLabel="Add page numbers"
      busyLabel="Numbering pages"
      canRun={!!item}
      onRun={() => r.run(async () => [await addPageNumbers(item.file, { position, format, start, size: Number(size), skipFirst })])}
      zipName="readily-numbered.zip"
      next={["watermark-pdf", "sign-pdf", "compress-pdf"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
