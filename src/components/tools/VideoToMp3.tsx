"use client";

import { useEffect, useState } from "react";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { formatTime } from "@/lib/files";
import { probe, toAudio } from "@/lib/media";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["video-to-mp3"];

export default function VideoToMp3() {
  const f = useFiles("video", false);
  const r = useRun();
  const [bitrate, setBitrate] = useState<"128k" | "192k" | "320k">("192k");
  const [duration, setDuration] = useState(0);

  const item = f.items[0];
  const { setDetail } = f;
  useEffect(() => {
    setDuration(0);
    if (!item) return;
    probe(item.file).then((m) => {
      setDuration(m.duration);
      if (m.duration) setDetail(item.id, formatTime(m.duration));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const { reset } = r;
  useEffect(() => reset(), [f.items, bitrate, reset]);

  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      reorder={false}
      listHeading="Your video"
      options={
        <Segmented
          legend="MP3 quality"
          name="br"
          value={bitrate}
          onChange={setBitrate}
          options={[
            { value: "128k", label: "128 kbps (speech)" },
            { value: "192k", label: "192 kbps (music)" },
            { value: "320k", label: "320 kbps (best)" },
          ]}
        />
      }
      actionLabel="Convert to MP3"
      busyLabel="Extracting audio"
      canRun={!!item}
      onRun={() => r.run(async (report) => [await toAudio(item.file, "mp3", { bitrate, duration }, report)])}
      zipName="readily-audio.zip"
      next={["trim-audio", "convert-audio"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
