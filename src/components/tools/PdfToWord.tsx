"use client";

import { useEffect } from "react";
import { useAccess } from "../Access";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["pdf-to-word"];

export default function PdfToWord() {
  const f = useFiles("pdf", false);
  const r = useRun();
  const access = useAccess();
  const { reset } = r;
  useEffect(() => reset(), [f.items, reset]);
  const item = f.items[0];
  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      listHeading="Your PDF"
      actionLabel="Convert to Word"
      busyLabel="Converting"
      canRun={!!item}
      onRun={async () => {
        if (!(await access.allow())) return;
        const { pdfToWord } = await import("@/lib/pdf-word");
        r.run(async (report) => [await pdfToWord(item.file, report)]);
      }}
      zipName="readily-word.zip"
      next={["summarize-pdf", "translate-document"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
