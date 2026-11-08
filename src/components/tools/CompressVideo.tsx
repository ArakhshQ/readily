"use client";

import { useEffect, useState } from "react";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { formatTime } from "@/lib/files";
import { compressVideo, probe, type VideoLevel } from "@/lib/media";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["compress-video"];

const HINT: Record<VideoLevel, string> = {
  high: "Sharp on big screens. Moderate savings.",
  balanced: "Looks good on phones and laptops. Good for messaging and most uploads.",
  small: "Smallest file for strict limits. Fine on phone screens.",
};

export default function CompressVideo() {
  const f = useFiles("video", false);
  const r = useRun();
  const [level, setLevel] = useState<VideoLevel>("balanced");
  const [meta, setMeta] = useState<{ duration: number; height: number } | null>(null);

  const item = f.items[0];
  const { setDetail } = f;
  useEffect(() => {
    setMeta(null);
    if (!item) return;
    probe(item.file).then((m) => {
      setMeta({ duration: m.duration, height: m.height });
      if (m.duration) setDetail(item.id, `${formatTime(m.duration)}${m.width ? `, ${m.width} × ${m.height}` : ""}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const { reset } = r;
  useEffect(() => reset(), [f.items, level, reset]);

  const long = (meta?.duration ?? 0) > 180;
  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      reorder={false}
      listHeading="Your video"
      options={
        <>
          <Segmented
            legend="Quality"
            name="vlevel"
            value={level}
            onChange={setLevel}
            options={[
              { value: "high", label: "High (1080p)" },
              { value: "balanced", label: "Balanced (720p)" },
              { value: "small", label: "Smallest (480p)" },
            ]}
            hint={HINT[level]}
          />
          {long && <p className="hint">This video is over 3 minutes, so compressing it on your device may take several minutes. Keep this tab open.</p>}
        </>
      }
      actionLabel="Compress video"
      busyLabel="Compressing video"
      canRun={!!item && !!meta}
      blockedReason="Reading the video…"
      onRun={() => r.run(async (report) => [await compressVideo(item.file, level, meta!, report)])}
      zipName="readily-video.zip"
      next={["trim-video", "video-to-mp3"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
