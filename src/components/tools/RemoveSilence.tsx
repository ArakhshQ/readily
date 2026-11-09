"use client";

import { useEffect, useState } from "react";
import { useAccess } from "../Access";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { formatTime } from "@/lib/files";
import { probe } from "@/lib/media";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["remove-silence"];

export default function RemoveSilence() {
  const f = useFiles("media", false);
  const r = useRun();
  const access = useAccess();
  const [pause, setPause] = useState<"0.5" | "1" | "2">("1");
  const [level, setLevel] = useState<"-40" | "-32" | "-25">("-32");
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
  useEffect(() => reset(), [f.items, pause, level, reset]);

  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      listHeading="Your recording"
      options={
        <>
          <Segmented
            legend="Cut pauses longer than"
            name="pause"
            value={pause}
            onChange={setPause}
            options={[
              { value: "0.5", label: "½ second" },
              { value: "1", label: "1 second" },
              { value: "2", label: "2 seconds" },
            ]}
          />
          <Segmented
            legend="What counts as silence"
            name="level"
            value={level}
            onChange={setLevel}
            hint="Use 'Some background noise' if the recording has a hum or room noise."
            options={[
              { value: "-40", label: "Very quiet only" },
              { value: "-32", label: "Normal" },
              { value: "-25", label: "Some background noise" },
            ]}
          />
        </>
      }
      actionLabel="Remove silences"
      busyLabel="Removing silences"
      canRun={!!item && duration > 0}
      blockedReason={item && !duration ? "Reading the file…" : undefined}
      onRun={async () => {
        if (!(await access.allow())) return;
        const { removeSilences } = await import("@/lib/media");
        r.run(async (report) => [
          await removeSilences(item.file, { minPause: Number(pause), threshold: Number(level), keep: 0.25, duration }, report),
        ]);
      }}
      zipName="readily-no-silence.zip"
      next={["noise-remover", "transcribe", "compress-video"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
