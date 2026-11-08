"use client";

import { useEffect, useState } from "react";
import { MediaTrim } from "../MediaTrim";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { formatTime } from "@/lib/files";
import { probe, toAudio, type AudioFormat } from "@/lib/media";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["trim-audio"];

export default function TrimAudio() {
  const f = useFiles("audio", false);
  const r = useRun();
  const [duration, setDuration] = useState(0);
  const [range, setRange] = useState({ start: 0, end: 0 });
  const [fade, setFade] = useState(false);
  const [format, setFormat] = useState<AudioFormat>("mp3");

  const item = f.items[0];
  const { setDetail } = f;
  useEffect(() => {
    setDuration(0);
    if (!item) return;
    probe(item.file).then((m) => {
      setDuration(m.duration);
      setRange({ start: 0, end: m.duration });
      if (m.duration) setDetail(item.id, formatTime(m.duration));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const { reset } = r;
  useEffect(() => reset(), [f.items, range, fade, format, reset]);

  const changed = duration > 0 && (range.start > 0.05 || range.end < duration - 0.05 || fade);
  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      reorder={false}
      listHeading="Your audio"
      options={
        item && duration > 0 ? (
          <>
            <MediaTrim file={item.file} kind="audio" duration={duration} start={range.start} end={range.end} onChange={(start, end) => setRange({ start, end })} />
            <label className="check">
              <input type="checkbox" checked={fade} onChange={(e) => setFade(e.target.checked)} />
              Fade in and out (1 second each)
            </label>
            <Segmented
              legend="Save as"
              name="tafmt"
              value={format}
              onChange={setFormat}
              options={[
                { value: "mp3", label: "MP3" },
                { value: "m4a", label: "M4A" },
                { value: "wav", label: "WAV" },
              ]}
            />
          </>
        ) : item ? (
          <p className="hint">Reading the audio…</p>
        ) : null
      }
      actionLabel="Trim audio"
      busyLabel="Trimming"
      canRun={changed}
      blockedReason={duration ? "Move the start or end point first." : "This browser can't play this file. Try converting it first."}
      onRun={() =>
        r.run(async (report) => [
          await toAudio(
            item.file,
            format,
            { start: range.start, end: range.end, duration, fadeIn: fade ? 1 : 0, fadeOut: fade ? 1 : 0, bitrate: "192k" },
            report,
          ),
        ])
      }
      zipName="readily-audio.zip"
      next={["convert-audio"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
