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

const tool = TOOL_BY_SLUG["noise-remover"];
const MAX_MIN = 30;

export default function NoiseRemover() {
  const f = useFiles("media", false);
  const r = useRun();
  const access = useAccess();
  const [strength, setStrength] = useState<"natural" | "strong">("natural");
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
  useEffect(() => reset(), [f.items, strength, reset]);
  const tooLong = duration > MAX_MIN * 60;

  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      listHeading="Your recording"
      options={
        <Segmented
          legend="How much to remove"
          name="strength"
          value={strength}
          onChange={setStrength}
          hint={strength === "natural" ? "Keeps a little room sound so the voice sounds natural." : "Removes as much noise as possible."}
          options={[
            { value: "natural", label: "Natural" },
            { value: "strong", label: "Strong" },
          ]}
        />
      }
      actionLabel="Remove noise"
      busyLabel="Removing noise"
      canRun={!!item && !tooLong}
      blockedReason={tooLong ? `Recordings up to ${MAX_MIN} minutes work on this device. Trim it first.` : undefined}
      onRun={async () => {
        if (!(await access.allow())) return;
        const { removeNoise } = await import("@/lib/denoise");
        r.run(async (report) => [await removeNoise(item.file, strength, duration || 60, report)]);
      }}
      zipName="readily-clean.zip"
      next={["remove-silence", "transcribe", "trim-audio"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
