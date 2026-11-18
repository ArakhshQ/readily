"use client";

import { useState } from "react";
import { ServerTool } from "../ServerTool";
import { VoicePicker } from "./VoicePicker";

export default function VoiceChanger() {
  const [voice, setVoice] = useState("");
  return (
    <ServerTool
      slug="voice-changer"
      input="media"
      maxMinutes={10}
      deps={[voice]}
      ready={{ ok: !!voice, why: "Pick a voice" }}
      options={
<VoicePicker value={voice} onChange={setVoice} />
      }
      actionLabel="Change voice"
      busyLabel="Changing the voice"
      work={async (file, m, report) => {
        const { audioForUpload, deliverAudio } = await import("@/lib/media");
        const { serverRun, creditNote } = await import("@/lib/ai-tools");
        const { fetchResult } = await import("@/lib/ai-client");
        const audio = await audioForUpload(file, m.minutes * 60, (p, l) => report(p * 0.2, l));
        const res = await serverRun("voice-changer", { blob: audio, ext: "mp3", payload: { voice } }, report, "Re-voicing your recording");
        const clean = await fetchResult(res.files![0]);
        const out = await deliverAudio(file, clean, "voice.mp3", "new voice", m.minutes * 60, (p, l) => report(0.93 + p * 0.07, l));
        out.checks = ["Voice changed", ...out.checks, creditNote(res)];
        return { res, outputs: [out] };
      }}
      next={["ai-voiceover", "studio-voice"]}
    />
  );
}
