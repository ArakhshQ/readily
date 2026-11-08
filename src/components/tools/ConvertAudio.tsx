"use client";

import { useEffect, useState } from "react";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { formatTime, type Output } from "@/lib/files";
import { probe, toAudio, type AudioFormat } from "@/lib/media";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["convert-audio"];

export default function ConvertAudio() {
  const f = useFiles("audio", true);
  const r = useRun();
  const [format, setFormat] = useState<AudioFormat>("mp3");
  const [bitrate, setBitrate] = useState<"128k" | "192k" | "320k">("192k");

  const { items, setDetail } = f;
  useEffect(() => {
    for (const it of items) {
      if (it.detail) continue;
      probe(it.file).then((m) => setDetail(it.id, m.duration ? formatTime(m.duration) : "length unknown"));
    }
  }, [items, setDetail]);

  const { reset } = r;
  useEffect(() => reset(), [items.length, format, bitrate, reset]);

  const n = items.length;
  const label = format.toUpperCase();
  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      reorder={false}
      listHeading="Audio to convert"
      options={
        <>
          <Segmented
            legend="Convert to"
            name="afmt"
            value={format}
            onChange={setFormat}
            options={[
              { value: "mp3", label: "MP3" },
              { value: "wav", label: "WAV" },
              { value: "m4a", label: "M4A" },
            ]}
            hint={format === "wav" ? "Uncompressed. Large files, perfect for editing." : format === "m4a" ? "Great sound at small sizes. Common on Apple devices." : "Plays on every device and app."}
          />
          {format !== "wav" && (
            <Segmented
              legend="Quality"
              name="abr"
              value={bitrate}
              onChange={setBitrate}
              options={[
                { value: "128k", label: "128 kbps" },
                { value: "192k", label: "192 kbps" },
                { value: "320k", label: "320 kbps" },
              ]}
            />
          )}
        </>
      }
      actionLabel={n > 1 ? `Convert ${n} files to ${label}` : `Convert to ${label}`}
      busyLabel="Converting audio"
      canRun={n > 0}
      onRun={() =>
        r.run(async (report) => {
          const out: Output[] = [];
          for (let i = 0; i < n; i++) {
            const m = await probe(items[i].file);
            out.push(
              await toAudio(items[i].file, format, { bitrate, duration: m.duration }, (p, l) => report((i + p) / n, `${l}: ${items[i].file.name}`)),
            );
          }
          return out;
        })
      }
      zipName="readily-audio.zip"
      next={["trim-audio"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
