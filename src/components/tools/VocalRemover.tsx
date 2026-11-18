"use client";

import { useState } from "react";
import { Segmented } from "../Segmented";
import { ServerTool } from "../ServerTool";

type Keep = "music" | "vocals";

export default function VocalRemover() {
  const [keep, setKeep] = useState<Keep>("music");
  return (
    <ServerTool
      slug="vocal-remover"
      input="media"
      maxMinutes={10}
      deps={[keep]}
      options={
        <Segmented
          legend="Keep"
          name="vkeep"
          value={keep}
          onChange={setKeep}
          options={[
            { value: "music", label: "Music only (karaoke)" },
            { value: "vocals", label: "Vocals only (acapella)" },
          ]}
          hint={keep === "music" ? "Removes the singing and keeps the instruments." : "Removes the instruments and keeps the voice."}
        />
      }
      actionLabel={keep === "music" ? "Remove vocals" : "Isolate vocals"}
      busyLabel="Separating the song (about a minute)"
      work={async (file, m, report) => {
        const { audioForUpload } = await import("@/lib/media");
        const { serverRun, creditNote } = await import("@/lib/ai-tools");
        const { fetchResult } = await import("@/lib/ai-client");
        const { baseName, formatBytes } = await import("@/lib/files");
        const audio = await audioForUpload(file, m.minutes * 60, (p, l) => report(p * 0.2, l));
        const res = await serverRun("vocal-remover", { blob: audio, ext: "mp3", payload: { keep } }, report, "Separating vocals and music");
        const blob = await fetchResult(res.files![0]);
        const label = keep === "music" ? "instrumental" : "vocals";
        return {
          res,
          outputs: [{ blob, name: `${baseName(file.name)} (${label}).mp3`, checks: [keep === "music" ? "Vocals removed" : "Vocals only", "MP3", formatBytes(blob.size), creditNote(res)] }],
        };
      }}
      next={["trim-audio", "convert-audio"]}
    />
  );
}
