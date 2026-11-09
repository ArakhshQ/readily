"use client";

import { useState } from "react";
import { useAccess } from "../Access";
import { Segmented } from "../Segmented";
import { ServerTool } from "../ServerTool";

export default function StudioVoice() {
  const access = useAccess();
  const premium = access.plan === "premium";
  const [quality, setQuality] = useState<"standard" | "best">("standard");
  const best = quality === "best";
  return (
    <ServerTool
      slug="studio-voice"
      input="media"
      maxMinutes={10}
      best={best}
      deps={[quality]}
      ready={{ ok: !best || premium, why: "Best quality is part of Premium" }}
      options={
        <Segmented
          legend="Quality"
          name="q"
          value={quality}
          onChange={setQuality}
          hint={best ? "Top-tier voice isolation for music, crowds and very noisy places. 30 credits a minute (Premium)." : "Rebuilds the voice: less echo and noise, fuller sound. 5 credits a minute."}
          options={[
            { value: "standard", label: "Studio" },
            { value: "best", label: premium ? "Best quality" : "Best quality (Premium)" },
          ]}
        />
      }
      actionLabel="Enhance voice"
      busyLabel="Enhancing"
      work={async (file, m, report) => {
        const { audioForUpload, deliverAudio } = await import("@/lib/media");
        const { serverRun, creditNote } = await import("@/lib/ai-tools");
        const { fetchResult } = await import("@/lib/ai-client");
        const audio = await audioForUpload(file, m.minutes * 60, (p, l) => report(p * 0.2, l));
        const res = await serverRun("studio-voice", { blob: audio, ext: "mp3", payload: { quality } }, report, "Enhancing your voice");
        const f = res.files?.[0];
        if (!f) throw new Error("The AI didn't return audio. Your credits were refunded if it failed.");
        const clean = await fetchResult(f);
        const out = await deliverAudio(file, clean, `enhanced.${f.name.split(".").pop() || "wav"}`, "studio voice", m.minutes * 60, (p, l) => report(0.93 + p * 0.07, l));
        out.checks = [best ? "Best-quality isolation" : "Studio enhanced", ...out.checks, creditNote(res)];
        return { res, outputs: [out] };
      }}
      next={["remove-silence", "transcribe", "auto-subtitles"]}
    />
  );
}
