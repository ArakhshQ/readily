"use client";

import { useEffect, useState } from "react";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { pageCount, parseRanges, splitPdf, type SplitMode } from "@/lib/pdf-ops";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["split-pdf"];

export default function SplitPdf() {
  const f = useFiles("pdf", false);
  const r = useRun();
  const [mode, setMode] = useState<SplitMode>("extract");
  const [ranges, setRanges] = useState("1");
  const [n, setN] = useState(2);
  const [pages, setPages] = useState<number | null>(null);

  const item = f.items[0];
  const { setDetail } = f;
  useEffect(() => {
    setPages(null);
    if (!item) return;
    let live = true;
    pageCount(item.file)
      .then((count) => {
        if (!live) return;
        setPages(count);
        setDetail(item.id, `${count} ${count === 1 ? "page" : "pages"}`);
        setRanges(count > 1 ? `1-${Math.min(count, 3)}` : "1");
      })
      .catch((e) => live && r.setError(e instanceof Error ? e.message : "This PDF couldn't be opened."));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const { reset } = r;
  useEffect(() => reset(), [f.items, mode, ranges, n, reset]);

  // Live check of the range text so mistakes show before pressing the button.
  let rangeError: string | null = null;
  let picked = 0;
  if (pages && mode === "extract") {
    try {
      picked = parseRanges(ranges, pages).length;
    } catch (e) {
      rangeError = e instanceof Error ? e.message : "Check the page numbers.";
    }
  }
  const parts = pages ? (mode === "every-page" ? pages : Math.ceil(pages / Math.max(1, n))) : 0;

  let summary = "";
  if (pages) {
    if (mode === "extract") summary = rangeError ? "" : `${picked} of ${pages} pages into one new PDF`;
    else summary = `${parts} separate PDFs in a ZIP`;
  }

  return (
    <Workspace
      tool={tool}
      {...f}
      reorder={false}
      listHeading="Your PDF"
      options={
        <>
          <Segmented
            legend="How to split"
            name="splitmode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "extract", label: "Pick pages" },
              { value: "every-page", label: "Every page" },
              { value: "every-n", label: "Equal parts" },
            ]}
          />
          {mode === "extract" && (
            <div className="field">
              <label className="field-label" htmlFor="ranges">
                Pages to keep
              </label>
              <input
                id="ranges"
                className="input"
                style={{ maxWidth: 420 }}
                value={ranges}
                onChange={(e) => setRanges(e.target.value)}
                placeholder="1-3, 5, 8-10"
                inputMode="numeric"
                aria-invalid={!!rangeError}
                aria-describedby="ranges-hint"
              />
              <p className="hint" id="ranges-hint" style={rangeError ? { color: "var(--danger)" } : undefined}>
                {rangeError ?? `Use commas and dashes, like 1-3, 5. ${pages ? `This PDF has ${pages} pages.` : ""}`}
              </p>
            </div>
          )}
          {mode === "every-n" && (
            <div className="field">
              <label className="field-label" htmlFor="nper">
                Pages in each part
              </label>
              <div className="input-unit" style={{ width: "fit-content" }}>
                <input id="nper" type="number" min={1} max={pages ?? 999} value={n} onChange={(e) => setN(Math.max(1, parseInt(e.target.value || "1", 10)))} />
                <span className="unit">pages</span>
              </div>
            </div>
          )}
        </>
      }
      actionLabel={mode === "extract" ? "Extract pages" : "Split PDF"}
      busyLabel="Splitting your PDF"
      canRun={!!pages && !rangeError}
      blockedReason={!pages ? "Reading your PDF" : rangeError ?? undefined}
      summary={summary}
      onRun={() => r.run(async (report) => splitPdf(item.file, mode, { ranges, n }, (d, t) => report(d / t)))}
      busy={r.busy}
      progress={r.progress}
      error={r.error}
      outputs={r.outputs}
      zipName={`${item ? item.file.name.replace(/\.pdf$/i, "") : "split"} - split.zip`}
      next={["merge-pdf"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
