"use client";

import { useEffect, useRef, useState } from "react";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { formatTime } from "@/lib/files";
import { mergeVideos, probe, SOCIAL_SHAPES, type SocialShape } from "@/lib/media";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["merge-videos"];
type Meta = { duration: number; width: number; height: number };

export default function MergeVideos() {
  const f = useFiles("video", true);
  const r = useRun();
  const [shape, setShape] = useState<SocialShape | "first">("first");
  const [hd, setHd] = useState(false);
  const metas = useRef(new Map<string, Meta | null>());
  const [, bump] = useState(0);
  const { items, setDetail } = f;

  useEffect(() => {
    for (const it of items) {
      if (metas.current.has(it.id)) continue;
      metas.current.set(it.id, null);
      probe(it.file).then((m) => {
        metas.current.set(it.id, m);
        if (m.duration) setDetail(it.id, `${formatTime(m.duration)}${m.width ? `, ${m.width} × ${m.height}` : ""}`);
        bump((n) => n + 1);
      });
    }
  }, [items, setDetail]);

  const { reset } = r;
  useEffect(() => reset(), [items, shape, hd, reset]);
  const ready = items.length >= 2 && items.every((it) => metas.current.get(it.id));
  const total = items.reduce((a, it) => a + (metas.current.get(it.id)?.duration ?? 0), 0);

  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      reorder
      listHeading="Your clips, in order"
      options={
        <>
          <Segmented
            legend="Frame"
            name="mshape"
            value={shape}
            onChange={setShape}
            options={[{ value: "first", label: "Same as first clip" }, ...(Object.keys(SOCIAL_SHAPES) as SocialShape[]).map((k) => ({ value: k, label: SOCIAL_SHAPES[k].label }))]}
            hint="Clips of other sizes get black bars so nothing is stretched."
          />
          <Segmented
            legend="Quality"
            name="mhd"
            value={hd ? "hd" : "sd"}
            onChange={(v) => setHd(v === "hd")}
            options={[
              { value: "sd", label: "720p (faster)" },
              { value: "hd", label: "1080p (sharper)" },
            ]}
          />
          {total > 180 && <p className="hint">That&apos;s {formatTime(total)} of video, so joining may take several minutes. Keep this tab open.</p>}
        </>
      }
      actionLabel={`Merge ${items.length} videos`}
      busyLabel="Joining videos"
      canRun={ready}
      blockedReason={items.length < 2 ? "Add at least two videos" : "Reading the videos…"}
      summary={total ? `${formatTime(total)} in total` : undefined}
      onRun={() =>
        r.run(async (report) => [
          await mergeVideos(
            items.map((it) => ({ file: it.file, ...(metas.current.get(it.id) as Meta) })),
            { shape, hd },
            report,
          ),
        ])
      }
      zipName="readily-merged.zip"
      next={["compress-video", "resize-video", "video-to-mp3"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
