"use client";

import { ServerTool } from "../ServerTool";
import { baseName, formatTime } from "@/lib/files";

export default function Transcribe() {
  return (
    <ServerTool
      slug="transcribe"
      input="media"
      maxMinutes={60}
      actionLabel="Transcribe"
      busyLabel="Transcribing"
      work={async (file, m, report) => {
        const { audioForUpload } = await import("@/lib/media");
        const { serverRun, cues, toSrt, toTranscript, toVtt, textOutput, creditNote } = await import("@/lib/ai-tools");
        const audio = await audioForUpload(file, m.minutes * 60, (p, l) => report(p * 0.25, l));
        const res = await serverRun("transcribe", { blob: audio, ext: "mp3" }, report, "Transcribing");
        const data = res.data as { language: string; words: import("@/lib/ai-tools").Word[] };
        const transcript = toTranscript(data.words) || res.text || "";
        const c = cues(data.words);
        const base = baseName(file.name);
        const lang = data.language ? `Language: ${data.language}` : "Language detected";
        return {
          res,
          outputs: [
            textOutput(transcript, `${base} (transcript).txt`, [`${transcript.split(/\s+/).filter(Boolean).length} words`, lang, `${formatTime(m.minutes * 60)} of audio`, creditNote(res)]),
            { blob: new Blob([toSrt(c)], { type: "application/x-subrip" }), name: `${base}.srt`, checks: [`${c.length} subtitle lines`, "SRT for video players"] },
            { blob: new Blob([toVtt(c)], { type: "text/vtt" }), name: `${base}.vtt`, checks: [`${c.length} subtitle lines`, "VTT for the web"] },
          ],
        };
      }}
      next={["summarize-pdf", "auto-subtitles"]}
    />
  );
}
