"use client";

import { ServerTool } from "../ServerTool";
import { baseName, formatBytes } from "@/lib/files";

export default function AutoSubtitles() {
  return (
    <ServerTool
      slug="auto-subtitles"
      input="video"
      maxMinutes={60}
      actionLabel="Make subtitles"
      busyLabel="Making subtitles"
      work={async (file, m, report) => {
        const { audioForUpload, ffRun } = await import("@/lib/media");
        const { serverRun, cues, toSrt, toVtt, creditNote } = await import("@/lib/ai-tools");
        const audio = await audioForUpload(file, m.minutes * 60, (p, l) => report(p * 0.2, l));
        const res = await serverRun("auto-subtitles", { blob: audio, ext: "mp3" }, report, "Listening and writing subtitles");
        const data = res.data as { language: string; words: import("@/lib/ai-tools").Word[] };
        const c = cues(data.words);
        if (!c.length) throw new Error("No speech was found in this video.");
        const srt = toSrt(c);
        const base = baseName(file.name);
        const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
        report(0.94, "Adding the subtitles to your video");
        // Subtitles as a track viewers can switch on; the picture isn't re-encoded.
        const video = await ffRun({
          inputs: [
            { name: `in.${ext}`, data: file },
            { name: "subs.srt", data: new Blob([srt]) },
          ],
          args: ["-i", `in.${ext}`, "-i", "subs.srt", "-map", "0:v:0", "-map", "0:a?", "-map", "1:0", "-c:v", "copy", "-c:a", "aac", "-c:s", "mov_text", "-metadata:s:s:0", `language=${data.language || "und"}`, "-movflags", "+faststart", "out.mp4"],
          output: "out.mp4",
          mime: "video/mp4",
          label: "Adding the subtitles to your video",
        });
        return {
          res,
          outputs: [
            { blob: video, name: `${base} (subtitled).mp4`, checks: ["Subtitles track you can switch on", creditNote(res), formatBytes(video.size)] },
            { blob: new Blob([srt], { type: "application/x-subrip" }), name: `${base}.srt`, checks: [`${c.length} subtitle lines`, "SRT for YouTube and editors"] },
            { blob: new Blob([toVtt(c)], { type: "text/vtt" }), name: `${base}.vtt`, checks: ["VTT for the web"] },
          ],
        };
      }}
      next={["ai-dubbing", "compress-video"]}
    />
  );
}
