"use client";

import { useEffect, useState } from "react";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { imagesToPdf, type Margin, type PageSize } from "@/lib/pdf-ops";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["jpg-to-pdf"];

export default function ImagesToPdf() {
  const f = useFiles("image", true);
  const r = useRun();
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [margin, setMargin] = useState<Margin>("small");
  const [name, setName] = useState("my-document");

  const { reset } = r;
  useEffect(() => reset(), [f.items, pageSize, margin, name, reset]);

  const n = f.items.length;
  return (
    <Workspace
      tool={tool}
      {...f}
      listHeading="Pages in your PDF"
      options={
        <>
          <div className="two-col">
            <Segmented
              legend="Page size"
              name="pagesize"
              value={pageSize}
              onChange={setPageSize}
              options={[
                { value: "a4", label: "A4" },
                { value: "letter", label: "Letter" },
                { value: "fit", label: "Same as image" },
              ]}
              hint={pageSize === "fit" ? "Each page takes the exact shape of its photo." : "Wide photos get a landscape page automatically."}
            />
            <Segmented
              legend="Margin"
              name="margin"
              value={margin}
              onChange={setMargin}
              options={[
                { value: "none", label: "None" },
                { value: "small", label: "Small" },
                { value: "normal", label: "Normal" },
              ]}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="pdfname">
              File name
            </label>
            <div className="input-unit" style={{ maxWidth: 420 }}>
              <input id="pdfname" value={name} onChange={(e) => setName(e.target.value.replace(/[\\/:*?"<>|]/g, ""))} style={{ width: "100%" }} />
              <span className="unit">.pdf</span>
            </div>
          </div>
        </>
      }
      actionLabel={`Create PDF`}
      busyLabel="Building your PDF"
      canRun={n > 0}
      summary={`${n} ${n === 1 ? "page" : "pages"}, one image per page`}
      onRun={() =>
        r.run(async (report) => [
          await imagesToPdf(
            f.items.map((i) => i.file),
            { pageSize, margin, name: name.trim() || "my-document" },
            (d) => report(d / n),
          ),
        ])
      }
      busy={r.busy}
      progress={r.progress}
      error={r.error}
      outputs={r.outputs}
      zipName="readily-pdf.zip"
      next={["merge-pdf", "split-pdf"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
