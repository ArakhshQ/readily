"use client";

import { useEffect } from "react";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { imagesToText } from "@/lib/ocr";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["image-to-text"];

export default function ImageToText() {
  const f = useFiles("image-pdf", true);
  const r = useRun();

  const { reset } = r;
  useEffect(() => reset(), [f.items, reset]);

  const n = f.items.length;
  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      listHeading="Files to read, in order"
      options={<p className="hint">Language: English. Text from all files is combined in the order shown.</p>}
      actionLabel="Extract text"
      busyLabel="Reading text"
      canRun={n > 0}
      onRun={() => r.run(async (report) => [await imagesToText(f.items.map((i) => i.file), report)])}
      zipName="readily-text.zip"
      next={[]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
