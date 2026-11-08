"use client";

import { useEffect, useRef, useState } from "react";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { mergePdfs, pageCount } from "@/lib/pdf-ops";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["merge-pdf"];

export default function MergePdf() {
  const f = useFiles("pdf", true);
  const r = useRun();
  const [name, setName] = useState("merged");
  const counted = useRef(new Set<string>());

  const { reset } = r;
  useEffect(() => reset(), [f.items.length, f.items, name, reset]);

  // Show each PDF's page count as soon as it's added.
  const { items, setDetail } = f;
  useEffect(() => {
    for (const it of items) {
      if (counted.current.has(it.id)) continue;
      counted.current.add(it.id);
      pageCount(it.file)
        .then((n) => setDetail(it.id, `${n} ${n === 1 ? "page" : "pages"}`))
        .catch(() => setDetail(it.id, "can't be opened"));
    }
  }, [items, setDetail]);

  const n = items.length;
  return (
    <Workspace
      tool={tool}
      {...f}
      listHeading="PDFs in merge order"
      options={
        <div className="field">
          <label className="field-label" htmlFor="mergename">
            File name
          </label>
          <div className="input-unit" style={{ maxWidth: 420 }}>
            <input id="mergename" value={name} onChange={(e) => setName(e.target.value.replace(/[\\/:*?"<>|]/g, ""))} style={{ width: "100%" }} />
            <span className="unit">.pdf</span>
          </div>
        </div>
      }
      actionLabel="Merge PDFs"
      busyLabel="Merging your PDFs"
      canRun={n >= 2}
      blockedReason="Add at least one more PDF to merge."
      summary={`${n} PDFs, top to bottom`}
      onRun={() =>
        r.run(async (report) => [
          await mergePdfs(
            items.map((i) => i.file),
            name.trim() || "merged",
            (d) => report(d / n),
          ),
        ])
      }
      busy={r.busy}
      progress={r.progress}
      error={r.error}
      outputs={r.outputs}
      zipName="readily-merged.zip"
      next={["split-pdf"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
