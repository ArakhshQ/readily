"use client";

import { useEffect, useState } from "react";
import { MediaTrim } from "../MediaTrim";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { formatTime } from "@/lib/files";
import { probe, trimVideo } from "@/lib/media";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["trim-video"];

export default function TrimVideo() {
  const f = useFiles("video", false);
  const r = useRun();
  const [duration, setDuration] = useState(0);
  const [range, setRange] = useState({ start: 0, end: 0 });
  const [exact, setExact] = useState<"fast" | "exact">("fast");

  const item = f.items[0];
  const { setDetail } = f;
  useEffect(() => {
    setDuration(0);
    if (!item) return;
    probe(item.file).then((m) => {
      setDuration(m.duration);
      setRange({ start: 0, end: m.duration });
      if (m.duration) setDetail(item.id, `${formatTime(m.duration)}${m.width ? `, ${m.width} × ${m.height}` : ""}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const { reset } = r;
  useEffect(() => reset(), [f.items, range, exact, reset]);

  const changed = duration > 0 && (range.start > 0.05 || range.end < duration - 0.05);
  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      reorder={false}
      listHeading="Your video"
      options={
        item && duration > 0 ? (
          <>
            <MediaTrim file={item.file} kind="video" duration={duration} start={range.start} end={range.end} onChange={(start, end) => setRange({ start, end })} />
            <Segmented
              legend="Cut style"
              name="cut"
              value={exact}
              onChange={setExact}
              options={[
                { value: "fast", label: "Fast, original quality" },
                { value: "exact", label: "Exact cut" },
              ]}
              hint={exact === "fast" ? "Usually takes seconds and keeps the original quality. If the cut would land off your times, Readily redoes it precisely." : "Frame-accurate MP4 every time. Takes longer because the video is re-encoded."}
            />
          </>
        ) : item ? (
          <p className="hint">Reading the video…</p>
        ) : null
      }
      actionLabel="Trim video"
      busyLabel="Trimming"
      canRun={changed}
      blockedReason={duration ? "Move the start or end point first." : "This browser can't preview this video. Try an MP4."}
      onRun={() => r.run(async (report) => [await trimVideo(item.file, range.start, range.end, exact === "exact", report)])}
      zipName="readily-video.zip"
      next={["compress-video", "video-to-mp3"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
