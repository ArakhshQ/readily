"use client";

// Shared by the GPU image tools: HD upscaler, restore, colorize, photo editor,
// product backgrounds and photo to video.
import { ServerTool } from "../ServerTool";
import type { ToolSlug } from "@/lib/tools";

export function ImageAiTool(props: {
  slug: ToolSlug;
  maxSide: number;
  suffix: string;
  label: string;
  action: string;
  options?: React.ReactNode;
  payload?: Record<string, unknown>;
  costFactor?: number;
  /** Shown when the result looks almost the same as the photo sent (an edit that did nothing). */
  unchangedNote?: string;
  ready?: { ok: boolean; why?: string };
  deps?: unknown[];
  checks: string[];
  next: ToolSlug[];
}) {
  return (
    <ServerTool
      slug={props.slug}
      input="image"
      options={props.options}
      ready={props.ready}
      deps={props.deps}
      costFactor={props.costFactor}
      actionLabel={props.action}
      busyLabel={props.label}
      work={async (file, _m, report) => {
        const { imageForUpload, serverRun, resultFiles, creditNote, changedShare } = await import("@/lib/ai-tools");
        report(0.05, "Preparing your photo");
        const img = await imageForUpload(file, props.maxSide);
        const res = await serverRun(props.slug, { blob: img.blob, ext: img.ext, payload: props.payload }, report, props.label);
        const outputs = await resultFiles(res, file.name, props.suffix, [...props.checks, creditNote(res)]);
        if (props.unchangedNote && /\.(png|jpe?g|webp)$/i.test(outputs[0]?.name ?? "")) {
          const share = await changedShare(img.blob, outputs[0].blob).catch(() => 1);
          if (share < 0.002) outputs[0].note = props.unchangedNote;
        }
        return { res, outputs };
      }}
      next={props.next}
    />
  );
}
