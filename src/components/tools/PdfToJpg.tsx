"use client";

import { useEffect, useState } from "react";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { pageCount, parseRanges, pdfToImages } from "@/lib/pdf-ops";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["pdf-to-jpg"];

export default function PdfToJpg() {
  const f = useFiles("pdf", false);
  const r = useRun();
  const [dpi, setDpi] = useState<"150" | "300">("150");
  const [format, setFormat] = useState<"image/jpeg" | "image/png">("image/jpeg");
  const [which, setWhich] = useState<"all" | "some">("all");
  const [ranges, setRanges] = useState("1");
  const [pages, setPages] = useState<number | null>(null);

  const item = f.items[0];
  const { setDetail } = f;
  useEffect(() => {
    setPages(null);
    if (!item) return;
    let live = true;
    pageCount(item.file)
      .then((n) => {
        if (!live) return;
        setPages(n);
        setDetail(item.id, `${n} ${n === 1 ? "page" : "pages"}`);
      })
      .catch((e) => live && r.setError(e instanceof Error ? e.message : "This PDF couldn't be opened."));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const { reset } = r;
  useEffect(() => reset(), [f.items, dpi, format, which, ranges, reset]);

  let rangeError: string | null = null;
  let count = pages ?? 0;
  if (pages && which === "some") {
    try {
      count = parseRanges(ranges, pages).length;
    } catch (e) {
      rangeError = e instanceof Error ? e.message : "Check the page numbers.";
    }
  }

  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      reorder={false}
      listHeading="Your PDF"
      options={
        <>
          <div className="two-col">
            <Segmented
              legend="Resolution"
              name="dpi"
              value={dpi}
              onChange={setDpi}
              options={[
                { value: "150", label: "Standard" },
                { value: "300", label: "High (print)" },
              ]}
            />
            <Segmented
              legend="Image format"
              name="ifmt"
              value={format}
              onChange={setFormat}
              options={[
                { value: "image/jpeg", label: "JPG" },
                { value: "image/png", label: "PNG" },
              ]}
            />
          </div>
          <Segmented
            legend="Pages"
            name="which"
            value={which}
            onChange={setWhich}
            options={[
              { value: "all", label: pages ? `All ${pages} pages` : "All pages" },
              { value: "some", label: "Pick pages" },
            ]}
          />
          {which === "some" && (
            <div className="field">
              <label className="field-label" htmlFor="jranges">
                Pages to convert
              </label>
              <input
                id="jranges"
                className="input"
                style={{ maxWidth: 420 }}
                value={ranges}
                onChange={(e) => setRanges(e.target.value)}
                placeholder="1-3, 5"
                inputMode="numeric"
                aria-invalid={!!rangeError}
              />
              <p className="hint" style={rangeError ? { color: "var(--danger)" } : undefined}>
                {rangeError ?? "Use commas and dashes, like 1-3, 5."}
              </p>
            </div>
          )}
        </>
      }
      actionLabel={`Convert to ${format === "image/png" ? "PNG" : "JPG"}`}
      busyLabel="Turning pages into images"
      canRun={!!pages && !rangeError}
      blockedReason={!pages ? "Reading your PDF" : rangeError ?? undefined}
      summary={pages ? `${count} ${count === 1 ? "image" : "images"}` : ""}
      onRun={() =>
        r.run(async (report) =>
          pdfToImages(item.file, { dpi: Number(dpi), format, ranges: which === "some" ? ranges : null }, (p) => report(p, "Drawing pages")),
        )
      }
      zipName={`${item ? item.file.name.replace(/\.pdf$/i, "") : "pages"} - images.zip`}
      next={["jpg-to-pdf", "compress-image", "image-to-text"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
