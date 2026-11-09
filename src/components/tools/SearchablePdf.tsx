"use client";

import { useEffect, useState } from "react";
import { useAccess } from "../Access";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { OCR_LANGUAGES } from "@/lib/searchable";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["searchable-pdf"];
const sorted = [...OCR_LANGUAGES].sort((a, b) => a[1].localeCompare(b[1]));

export default function SearchablePdf() {
  const f = useFiles("image-pdf", true);
  const r = useRun();
  const access = useAccess();
  const [lang, setLang] = useState("eng");
  const [lang2, setLang2] = useState("");
  const { reset } = r;
  useEffect(() => reset(), [f.items, lang, lang2, reset]);
  const n = f.items.length;
  const langs = [lang, lang2].filter((l, i, a) => l && a.indexOf(l) === i);
  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      reorder
      listHeading={n === 1 ? "Your file" : `Your files, in order (${n})`}
      options={
        <div className="field-pair">
          <div className="field">
            <label className="field-label" htmlFor="lang">
              Language of the text
            </label>
            <select id="lang" className="input" value={lang} onChange={(e) => setLang(e.target.value)}>
              {sorted.map(([c, name]) => (
                <option key={c} value={c}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="lang2">
              Second language (optional)
            </label>
            <select id="lang2" className="input" value={lang2} onChange={(e) => setLang2(e.target.value)}>
              <option value="">None</option>
              {sorted.map(([c, name]) => (
                <option key={c} value={c}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      }
      actionLabel="Make searchable"
      busyLabel="Reading the pages"
      canRun={n > 0}
      onRun={async () => {
        if (!(await access.allow())) return;
        const { makeSearchable } = await import("@/lib/searchable");
        r.run((report) => makeSearchable(f.items.map((i) => i.file), langs, report).then((o) => [o]));
      }}
      zipName="readily-searchable.zip"
      next={["pdf-to-word", "summarize-pdf", "compress-pdf"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
