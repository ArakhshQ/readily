"use client";

import { ServerTool } from "../ServerTool";
import type { ToolSlug } from "@/lib/tools";

export function VideoAiTool(props: {
  slug: ToolSlug;
  maxMinutes: number;
  maxHeight: number;
  suffix: string;
  label: string;
  action: string;
  options?: React.ReactNode;
  payload?: Record<string, unknown>;
  deps?: unknown[];
  checks: string[];
  next: ToolSlug[];
}) {
  return (
    <ServerTool
      slug={props.slug}
      input="video"
      maxMinutes={props.maxMinutes}
      options={props.options}
      deps={props.deps}
      actionLabel={props.action}
      busyLabel={props.label}
      work={async (file, m, report) => {
        const { videoForUpload } = await import("@/lib/media");
        const { serverRun, resultFiles, creditNote } = await import("@/lib/ai-tools");
        const video = await videoForUpload(file, m.minutes * 60, props.maxHeight, (p, l) => report(p * 0.25, l));
        const res = await serverRun(props.slug, { blob: video, ext: "mp4", payload: props.payload }, report, props.label);
        return { res, outputs: await resultFiles(res, file.name, props.suffix, [...props.checks, creditNote(res)]) };
      }}
      next={props.next}
    />
  );
}
