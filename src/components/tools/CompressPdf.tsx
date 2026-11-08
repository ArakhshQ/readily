"use client";

import { useEffect, useState } from "react";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { compressPdf, type CompressLevel } from "@/lib/pdf-ops";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["compress-pdf"];

const HINTS: Record<CompressLevel, string> = {
  lossless: "Tidies the file without changing how it looks. Text stays selectable. Savings are usually small.",
  balanced: "Good for email and most upload forms. Pages are saved as clear images, so text can't be selected.",
  strong: "Smallest file for strict limits. Pages stay readable on screen but look softer when printed.",
};

export default function CompressPdf() {
  const f = useFiles("pdf", false);
  const r = useRun();
  const [level, setLevel] = useState<CompressLevel>("balanced");

  const { reset } = r;
  useEffect(() => reset(), [f.items, level, reset]);

  const item = f.items[0];
  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      reorder={false}
      listHeading="PDF to compress"
      options={
        <Segmented
          legend="How small"
          name="level"
          value={level}
          onChange={setLevel}
          options={[
            { value: "lossless", label: "Keep text selectable" },
            { value: "balanced", label: "Balanced" },
            { value: "strong", label: "Smallest" },
          ]}
          hint={HINTS[level]}
        />
      }
      actionLabel="Compress PDF"
      busyLabel="Compressing your PDF"
      canRun={!!item}
      onRun={() => r.run(async (report) => [await compressPdf(item.file, level, (p) => report(p, "Compressing pages"))])}
      zipName="readily-compressed.zip"
      next={["merge-pdf", "split-pdf", "sign-pdf"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
